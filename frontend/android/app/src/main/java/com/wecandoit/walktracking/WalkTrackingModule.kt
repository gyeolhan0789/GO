package com.wecandoit.walktracking

import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

private const val START_POLL_INTERVAL_MS = 50L
private const val START_POLL_MAX_ATTEMPTS = 20 // 최대 약 1초

/**
 * RN 브릿지 진입점. 상태를 바꾸는 실제 로직은 전부 WalkForegroundService에 있고,
 * 이 모듈은 서비스가 이미 떠있으면 인스턴스를 직접 호출해 동기적인 결과를
 * 돌려주고, 아직 없으면(최초 startSession) Intent로 띄운 뒤 인스턴스가 잡힐
 * 때까지 짧게 재시도한다.
 */
class WalkTrackingModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    @Volatile
    private var emitterRef: WeakReference<WalkTrackingModule>? = null

    fun emit(name: String, payload: WritableMap?) {
      val module = emitterRef?.get() ?: return
      module.reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(name, payload)
    }
  }

  override fun initialize() {
    super.initialize()
    emitterRef = WeakReference(this)
  }

  override fun invalidate() {
    emitterRef = null
    super.invalidate()
  }

  override fun getName(): String = "WalkTracking"

  @ReactMethod
  fun startSession(roomId: Double, gender: String?, promise: Promise) {
    val existing = WalkForegroundService.instance
    if (existing != null) {
      promise.resolve(snapshotToMap(existing.start(roomId.toLong(), gender)))
      return
    }

    val intent = Intent(reactContext, WalkForegroundService::class.java).apply {
      action = WalkTrackingConstants.ACTION_START
      putExtra(WalkTrackingConstants.EXTRA_ROOM_ID, roomId.toLong())
      putExtra(WalkTrackingConstants.EXTRA_GENDER, gender)
    }
    try {
      ContextCompat.startForegroundService(reactContext, intent)
    } catch (t: Throwable) {
      promise.reject("START_FAILED", t)
      return
    }
    waitForInstanceAndResolve(promise, START_POLL_MAX_ATTEMPTS)
  }

  private fun waitForInstanceAndResolve(promise: Promise, attemptsLeft: Int) {
    val service = WalkForegroundService.instance
    if (service != null) {
      promise.resolve(snapshotToMap(service.currentSnapshot()))
      return
    }
    if (attemptsLeft <= 0) {
      promise.reject("START_TIMEOUT", "산책 기록 서비스를 시작하지 못했습니다.")
      return
    }
    Handler(Looper.getMainLooper()).postDelayed(
      { waitForInstanceAndResolve(promise, attemptsLeft - 1) },
      START_POLL_INTERVAL_MS,
    )
  }

  @ReactMethod
  fun pauseSession(promise: Promise) {
    val service = WalkForegroundService.instance
    if (service == null) {
      promise.reject("NO_ACTIVE_SESSION", "진행 중인 산책이 없습니다.")
      return
    }
    promise.resolve(snapshotToMap(service.pause()))
  }

  @ReactMethod
  fun resumeSession(promise: Promise) {
    val service = WalkForegroundService.instance
    if (service == null) {
      promise.reject("NO_ACTIVE_SESSION", "진행 중인 산책이 없습니다.")
      return
    }
    promise.resolve(snapshotToMap(service.resume()))
  }

  @ReactMethod
  fun stopSession(promise: Promise) {
    val service = WalkForegroundService.instance
    if (service == null) {
      // 이미 끝났거나 서비스가 죽어있는 상태 — 중복 종료 호출도 안전하게 IDLE을 돌려준다.
      promise.resolve(snapshotToMap(WalkSessionState().toSnapshot(System.currentTimeMillis())))
      return
    }
    service.stop { snapshot -> promise.resolve(snapshotToMap(snapshot)) }
  }

  @ReactMethod
  fun getSessionSnapshot(promise: Promise) {
    val service = WalkForegroundService.instance
    if (service != null) {
      promise.resolve(snapshotToMap(service.currentSnapshot()))
      return
    }
    val repository = WalkSessionRepository(reactContext)
    val persisted = repository.load()
    if (persisted.status != WalkStatus.IDLE) {
      // 서비스가 죽어있는데 저장된 세션이 있다 — 복구를 트리거한다(fire-and-forget,
      // intent.action == null이라 서비스의 recoverFromPersistedState()로 간다).
      ContextCompat.startForegroundService(
        reactContext,
        Intent(reactContext, WalkForegroundService::class.java),
      )
    }
    promise.resolve(snapshotToMap(persisted.toSnapshot(System.currentTimeMillis())))
  }

  @ReactMethod
  fun getRoute(promise: Promise) {
    val service = WalkForegroundService.instance
    if (service != null) {
      promise.resolve(routeToArray(service.currentRoute()))
      return
    }
    val repository = WalkSessionRepository(reactContext)
    promise.resolve(routeToArray(repository.readRoute(repository.load().sessionId)))
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // NativeEventEmitter가 요구하는 필수 메서드(RN이 내부적으로 호출).
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // NativeEventEmitter가 요구하는 필수 메서드(RN이 내부적으로 호출).
  }
}
