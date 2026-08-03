package com.wecandoit.walktracking

import android.Manifest
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import java.util.UUID
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

private const val GPS_INTERVAL_MS = 5000L
private const val GPS_MIN_DISTANCE_METERS = 5f
// 고층 건물 등의 GPS 멀티패스로 튄 좌표를 걸러낸다(useRouteTracking.ts에서 쓰던
// 값과 동일 — 이제 이 서비스가 유일한 GPS 소스라 여기로 이전한다).
private const val MAX_ACCURACY_METERS = 30f
private const val MAX_SPEED_METERS_PER_SECOND = 7.0
private const val HEALTH_POLL_INTERVAL_MS = 20000L
private const val EARTH_RADIUS_METERS = 6371000.0

/**
 * 산책 세션 상태의 단일 원본. GPS 추적, 경과시간, 걸음수·칼로리 집계, 영속화,
 * 지속 알림을 모두 소유한다. RN에서의 진입점은 WalkTrackingModule이다.
 *
 * 상태를 바꾸는 실제 로직은 start/pause/resume/stop 네 개의 public 메서드에만
 * 있다. onStartCommand는 그 메서드들을 호출하는 얇은 디스패처일 뿐이다 — 알림
 * 버튼(WalkActionReceiver)과 OS 재기동(복구)은 Intent를 통해 이 메서드들에
 * 도달하고, JS(WalkTrackingModule)는 서비스가 이미 떠있으면 인스턴스를 통해
 * 직접 호출해 동기적인 반환값을 받는다.
 */
class WalkForegroundService : Service() {

  companion object {
    @Volatile
    var instance: WalkForegroundService? = null
      private set
  }

  private lateinit var repository: WalkSessionRepository
  private lateinit var fusedClient: FusedLocationProviderClient
  private lateinit var healthProvider: HealthSnapshotProvider
  private lateinit var notificationHelper: WalkNotificationHelper

  private var state = WalkSessionState()
  private var lastAcceptedPoint: RoutePoint? = null

  private val mainHandler = Handler(Looper.getMainLooper())
  private val healthPollRunnable = object : Runnable {
    override fun run() {
      pollHealth()
      mainHandler.postDelayed(this, HEALTH_POLL_INTERVAL_MS)
    }
  }

  private val locationCallback = object : LocationCallback() {
    override fun onLocationResult(result: LocationResult) {
      result.lastLocation?.let { onLocationAccepted(it) }
    }
  }

  override fun onCreate() {
    super.onCreate()
    instance = this
    repository = WalkSessionRepository(this)
    fusedClient = LocationServices.getFusedLocationProviderClient(this)
    healthProvider = HealthSnapshotProvider(this)
    notificationHelper = WalkNotificationHelper(this)
    notificationHelper.ensureChannel()
  }

  override fun onDestroy() {
    instance = null
    mainHandler.removeCallbacksAndMessages(null)
    stopLocationUpdates()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      null -> recoverFromPersistedState()
      WalkTrackingConstants.ACTION_START -> {
        val roomId = intent.getLongExtra(WalkTrackingConstants.EXTRA_ROOM_ID, -1L)
        val gender = intent.getStringExtra(WalkTrackingConstants.EXTRA_GENDER)
        start(roomId, gender)
      }
      WalkTrackingConstants.ACTION_PAUSE -> pause()
      WalkTrackingConstants.ACTION_RESUME -> resume()
      WalkTrackingConstants.ACTION_STOP -> stop {}
    }
    return START_STICKY
  }

  // ---- 상태 전이 (단일 원본 로직) ----

  fun start(roomId: Long, gender: String?): WalkSessionSnapshot {
    val persisted = repository.load()
    if (persisted.status != WalkStatus.IDLE && persisted.roomId != roomId) {
      // 다른 방의 세션이 이미 진행 중 — 덮어쓰지 않고 그 상태를 그대로 반환한다.
      // JS는 roomId 불일치를 보고 안내 문구를 띄운다.
      state = persisted
      return state.toSnapshot(System.currentTimeMillis())
    }
    if (persisted.status != WalkStatus.IDLE && persisted.roomId == roomId) {
      // 같은 방 세션 재연결(JS만 재시작된 경우 등) — 새로 만들지 않고 이어간다.
      state = persisted
      lastAcceptedPoint = repository.readRoute(state.sessionId).lastOrNull()
      startForegroundWithNotification()
      if (state.status == WalkStatus.RUNNING) {
        startLocationUpdates()
        restartHealthPoll()
      }
      return state.toSnapshot(System.currentTimeMillis())
    }

    val sessionId = UUID.randomUUID().toString()
    repository.deleteOrphanRouteFiles(exceptSessionId = sessionId)
    state = WalkSessionState(
      sessionId = sessionId,
      roomId = roomId,
      status = WalkStatus.RUNNING,
      startedAt = System.currentTimeMillis(),
      gender = gender,
    )
    lastAcceptedPoint = null
    repository.save(state)
    startForegroundWithNotification()

    healthProvider.readNow(gender) { baseline, source ->
      state = state.copy(baseline = baseline, lastRaw = baseline, healthSource = source)
      repository.save(state)
      updateNotification()
      emitState()
    }

    startLocationUpdates()
    restartHealthPoll()
    return state.toSnapshot(System.currentTimeMillis())
  }

  fun pause(): WalkSessionSnapshot {
    if (state.status != WalkStatus.RUNNING) return state.toSnapshot(System.currentTimeMillis())
    stopLocationUpdates()
    mainHandler.removeCallbacks(healthPollRunnable)
    state = state.copy(status = WalkStatus.PAUSED, pausedAt = System.currentTimeMillis())
    repository.save(state)
    updateNotification()

    healthProvider.readNow(state.gender) { raw, _ ->
      // 일시정지 시점의 최신 raw 값을 확정해둔다 — 재개 시 이 값과의 차이만큼
      // baseline을 밀어서 일시정지 중 늘어난 값을 세션 기록에서 제외한다.
      state = state.copy(lastRaw = raw)
      repository.save(state)
      emitState()
    }

    val snapshot = state.toSnapshot(System.currentTimeMillis())
    emitState(snapshot)
    return snapshot
  }

  fun resume(): WalkSessionSnapshot {
    if (state.status != WalkStatus.PAUSED) return state.toSnapshot(System.currentTimeMillis())
    val now = System.currentTimeMillis()
    val pausedAt = state.pausedAt ?: now
    state = state.copy(
      status = WalkStatus.RUNNING,
      pausedMs = state.pausedMs + (now - pausedAt),
      pausedAt = null,
    )
    repository.save(state)
    updateNotification()

    healthProvider.readNow(state.gender) { resumeRaw, source ->
      val shifted = HealthBaseline(
        steps = state.baseline.steps + max(0.0, resumeRaw.steps - state.lastRaw.steps),
        distanceMeters = state.baseline.distanceMeters +
          max(0.0, resumeRaw.distanceMeters - state.lastRaw.distanceMeters),
        calories = state.baseline.calories + max(0.0, resumeRaw.calories - state.lastRaw.calories),
      )
      state = state.copy(baseline = shifted, lastRaw = resumeRaw, healthSource = source)
      repository.save(state)
      updateNotification()
      emitState()
    }

    startLocationUpdates()
    restartHealthPoll()
    val snapshot = state.toSnapshot(System.currentTimeMillis())
    emitState(snapshot)
    return snapshot
  }

  /** 20초 폴링 주기의 캐시된 값을 그대로 확정하면 마지막 폴링 이후 최대
   * 20초치 걸음·거리·칼로리가 최종 기록에서 빠진다 — 종료 직전에 반드시
   * 한 번 더 읽어서 lastRaw를 최신화한 뒤 스냅샷을 확정한다. */
  fun stop(onResult: (WalkSessionSnapshot) -> Unit) {
    if (state.status == WalkStatus.IDLE) {
      onResult(state.toSnapshot(System.currentTimeMillis()))
      return
    }
    stopLocationUpdates()
    mainHandler.removeCallbacksAndMessages(null)

    healthProvider.readNow(state.gender) { raw, source ->
      state = state.copy(lastRaw = raw, healthSource = source)
      val finalSnapshot = state.toSnapshot(System.currentTimeMillis())
      finishStop()
      onResult(finalSnapshot)
    }
  }

  private fun finishStop() {
    repository.deleteRoute(state.sessionId)
    repository.clear()
    state = WalkSessionState()
    lastAcceptedPoint = null
    notificationHelper.cancel()
    emitState(state.toSnapshot(System.currentTimeMillis()))
    stopForegroundCompat()
    stopSelf()
  }

  fun currentSnapshot(): WalkSessionSnapshot = state.toSnapshot(System.currentTimeMillis())

  fun currentRoute(): List<RoutePoint> = repository.readRoute(state.sessionId)

  // ---- 위치 ----

  private fun startLocationUpdates() {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, GPS_INTERVAL_MS)
      .setMinUpdateDistanceMeters(GPS_MIN_DISTANCE_METERS)
      .build()
    try {
      fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
    } catch (e: SecurityException) {
      // 세션 도중 위치 권한이 회수된 경우 — 위치만 포기하고 세션(걸음수·칼로리·
      // 알림)은 계속 유지한다.
    }
  }

  private fun stopLocationUpdates() {
    fusedClient.removeLocationUpdates(locationCallback)
  }

  private fun onLocationAccepted(location: Location) {
    if (state.status != WalkStatus.RUNNING) return
    if (location.accuracy > MAX_ACCURACY_METERS) return

    val point = RoutePoint(location.latitude, location.longitude, location.time)
    val previous = lastAcceptedPoint
    if (previous != null) {
      val elapsedSeconds = (point.timestamp - previous.timestamp) / 1000.0
      if (elapsedSeconds > 0) {
        val distanceMeters = haversineMeters(previous, point)
        if (distanceMeters / elapsedSeconds > MAX_SPEED_METERS_PER_SECOND) return
      }
    }

    lastAcceptedPoint = point
    state.sessionId?.let { repository.appendRoutePoint(it, point) }
    emitRoutePoint(point)
  }

  private fun haversineMeters(a: RoutePoint, b: RoutePoint): Double {
    val dLat = Math.toRadians(b.latitude - a.latitude)
    val dLng = Math.toRadians(b.longitude - a.longitude)
    val lat1 = Math.toRadians(a.latitude)
    val lat2 = Math.toRadians(b.latitude)
    val h = sin(dLat / 2).pow(2) + cos(lat1) * cos(lat2) * sin(dLng / 2).pow(2)
    return 2 * EARTH_RADIUS_METERS * asin(min(1.0, sqrt(h)))
  }

  // ---- 헬스 폴링 ----

  private fun restartHealthPoll() {
    mainHandler.removeCallbacks(healthPollRunnable)
    mainHandler.postDelayed(healthPollRunnable, HEALTH_POLL_INTERVAL_MS)
  }

  private fun pollHealth() {
    if (state.status != WalkStatus.RUNNING) return
    healthProvider.readNow(state.gender) { raw, source ->
      state = state.copy(lastRaw = raw, healthSource = source)
      repository.save(state)
      updateNotification()
      emitState()
    }
  }

  // ---- 알림/포그라운드 ----

  private fun startForegroundWithNotification() {
    val notification = notificationHelper.build(state, state.toSnapshot(System.currentTimeMillis()))
    startForeground(WalkTrackingConstants.NOTIFICATION_ID, notification)
  }

  private fun updateNotification() {
    val notification = notificationHelper.build(state, state.toSnapshot(System.currentTimeMillis()))
    notificationHelper.postOrUpdate(notification)
  }

  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
  }

  // ---- 복구 ----

  /** OS가 START_STICKY로 서비스를 재기동했을 때(intent == null) 저장된 상태를
   * 읽어 이어간다. 강제종료 후 콜드스타트 복구는 WalkTrackingModule이 이
   * 서비스를 다시 띄울 때 같은 경로(intent == null)를 타게 만든다. */
  private fun recoverFromPersistedState() {
    val persisted = repository.load()
    if (persisted.status == WalkStatus.IDLE) {
      stopSelf()
      return
    }
    state = persisted
    lastAcceptedPoint = repository.readRoute(state.sessionId).lastOrNull()
    startForegroundWithNotification()
    if (state.status == WalkStatus.RUNNING) {
      startLocationUpdates()
      restartHealthPoll()
    }
    emitState()
  }

  // ---- 이벤트 ----

  private fun emitState(snapshot: WalkSessionSnapshot = state.toSnapshot(System.currentTimeMillis())) {
    WalkTrackingModule.emit(WalkTrackingConstants.EVENT_STATE_CHANGED, snapshotToMap(snapshot))
  }

  private fun emitRoutePoint(point: RoutePoint) {
    val map = Arguments.createMap().apply {
      putMap(
        "point",
        Arguments.createMap().apply {
          putDouble("latitude", point.latitude)
          putDouble("longitude", point.longitude)
          putDouble("timestamp", point.timestamp.toDouble())
        },
      )
    }
    WalkTrackingModule.emit(WalkTrackingConstants.EVENT_ROUTE_APPENDED, map)
  }
}

fun snapshotToMap(snapshot: WalkSessionSnapshot): WritableMap = Arguments.createMap().apply {
  putString("sessionId", snapshot.sessionId)
  if (snapshot.roomId != null) putDouble("roomId", snapshot.roomId.toDouble()) else putNull("roomId")
  putString("status", snapshot.status.name)
  if (snapshot.startedAt != null) putDouble("startedAt", snapshot.startedAt.toDouble()) else putNull("startedAt")
  putDouble("activeElapsedMs", snapshot.activeElapsedMs.toDouble())
  putDouble("steps", snapshot.steps)
  putDouble("distanceMeters", snapshot.distanceMeters)
  putDouble("calories", snapshot.calories)
}

fun routeToArray(points: List<RoutePoint>) = Arguments.createArray().apply {
  points.forEach { point ->
    pushMap(
      Arguments.createMap().apply {
        putDouble("latitude", point.latitude)
        putDouble("longitude", point.longitude)
        putDouble("timestamp", point.timestamp.toDouble())
      },
    )
  }
}
