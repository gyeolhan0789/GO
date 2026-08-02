package com.wecandoit.wearbridge

import android.util.Log
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.google.android.gms.wearable.Asset
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.DataMap
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.wecandoit.wear.protocol.WearProtocol
import java.util.concurrent.Executors

private const val TAG = "WearBridge"

/**
 * 갤럭시 워치(Wear OS) 컴패니언 앱과 이어주는 네이티브 모듈.
 *
 * 폰이 상태의 주인이다. JS가 화면에 그리는 것과 같은 값을 [syncState]로 워치에
 * 밀어주고, 워치가 누른 것은 [PhoneWearListenerService]가 받아 큐에 넣으면
 * JS가 [consumePendingCommands]로 가져간다.
 */
class WearBridgeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "WearBridge"

  private val dataClient by lazy { Wearable.getDataClient(reactContext) }
  private val capabilityClient by lazy { Wearable.getCapabilityClient(reactContext) }

  /** 캐릭터 합성은 네트워크와 비트맵 작업이라 JS 스레드에서 하면 안 된다. */
  private val backgroundExecutor = Executors.newSingleThreadExecutor()
  private val characterComposer by lazy { CharacterComposer(reactContext) }

  /** NativeEventEmitter가 요구하는 짝. 실제 구독은 RCTDeviceEventEmitter가 맡는다. */
  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  /**
   * 워치 앱이 깔린 기기가 지금 닿는지.
   *
   * 연결된 노드를 그냥 세지 않는다. 우리 앱이 없는 페어링 기기까지 연결로
   * 쳐버리면, 받을 곳도 없는데 상태를 계속 밀게 된다.
   */
  @ReactMethod
  fun isWatchConnected(promise: Promise) {
    capabilityClient
      .getCapability(WearProtocol.CAPABILITY_WATCH_APP, CapabilityClient.FILTER_REACHABLE)
      .addOnSuccessListener { info -> promise.resolve(info.nodes.isNotEmpty()) }
      .addOnFailureListener { throwable -> promise.reject("CAPABILITY_FAILED", throwable) }
  }

  /**
   * 워치 화면이 필요한 상태 전부를 한 번에 보낸다. 부분 갱신은 하지 않는다 —
   * 항목별로 따로 보내면 워치에서 반쯤 갱신된 화면이 보인다.
   */
  @ReactMethod
  fun syncState(state: ReadableMap, promise: Promise) {
    val request = PutDataMapRequest.create(WearProtocol.PATH_STATE)
    request.dataMap.apply {
      // 내용이 같으면 DataClient가 변경으로 안 쳐서 워치가 갱신을 못 받는다.
      putLong(WearProtocol.KEY_UPDATED_AT, System.currentTimeMillis())
      putString(WearProtocol.KEY_NICKNAME, state.getString("nickname").orEmpty())
      putDataMap(WearProtocol.KEY_TODAY, state.getMap("today").toTodayDataMap())
      putDataMapArrayList(WearProtocol.KEY_ROOMS, state.getArray("rooms").toRoomDataMaps())
      state.getMap("session")?.let { putDataMap(WearProtocol.KEY_SESSION, it.toSessionDataMap()) }
    }

    dataClient
      // setUrgent가 없으면 Data Layer가 전송을 최대 30분까지 미룰 수 있다.
      // 산책 중 걸음수처럼 지금 보여야 하는 값이라 항상 켠다.
      .putDataItem(request.asPutDataRequest().setUrgent())
      .addOnSuccessListener { promise.resolve(null) }
      .addOnFailureListener { throwable -> promise.reject("SYNC_FAILED", throwable) }
  }

  /**
   * 캐릭터 레이어를 한 장으로 합쳐 보낸다. [sources]는 아래에 깔릴 것부터
   * 순서대로 넘긴다(기본 캐릭터 -> 하의 -> 상의 -> 모자).
   */
  @ReactMethod
  fun syncCharacter(sources: ReadableArray, promise: Promise) {
    val layers = (0 until sources.size()).mapNotNull { sources.getString(it) }
    backgroundExecutor.execute {
      val png = characterComposer.composePng(layers)
      if (png == null) {
        promise.reject("COMPOSE_FAILED", "캐릭터 이미지를 만들지 못했습니다.")
        return@execute
      }

      val request = PutDataMapRequest.create(WearProtocol.PATH_CHARACTER)
      request.dataMap.apply {
        putLong(WearProtocol.KEY_UPDATED_AT, System.currentTimeMillis())
        putAsset(WearProtocol.ASSET_CHARACTER_IMAGE, Asset.createFromBytes(png))
      }

      dataClient
        .putDataItem(request.asPutDataRequest().setUrgent())
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { throwable -> promise.reject("SYNC_FAILED", throwable) }
    }
  }

  /**
   * 워치가 보낸 명령을 가져가면서 큐를 비운다. 앱을 켤 때와 이벤트를 받았을 때
   * 둘 다 여기로 오므로, 어느 쪽으로 도착했든 정확히 한 번만 처리된다.
   */
  @ReactMethod
  fun consumePendingCommands(promise: Promise) {
    runCatching {
      val commands = PendingWearCommands.consume(reactContext, System.currentTimeMillis())
      // "탭해서 이어가기" 알림은 앱을 열게 하려던 것이다. 여기까지 왔으면
      // 앱이 떠 있으니 할 일이 없다 — 만료돼서 실행할 게 없었더라도, 눌러도
      // 아무 일 안 나는 알림을 남겨두면 그게 더 나쁘다.
      NotificationManagerCompat.from(reactContext).cancel(WEAR_COMMAND_NOTIFICATION_ID)
      Arguments.createArray().apply {
        commands.forEach { command ->
          pushMap(
            Arguments.createMap().apply {
              putString("type", command.type)
              command.roomId?.let { putDouble("roomId", it.toDouble()) }
            },
          )
        }
      }
    }.fold(
      onSuccess = { promise.resolve(it) },
      onFailure = { throwable ->
        Log.w(TAG, "대기 중인 명령을 못 읽었다", throwable)
        promise.reject("CONSUME_FAILED", throwable)
      },
    )
  }

  override fun invalidate() {
    backgroundExecutor.shutdown()
    super.invalidate()
  }
}

/** JS가 준 숫자는 전부 double로 넘어온다. 정수 필드는 여기서 잘라 쓴다. */
private fun ReadableMap.intOf(key: String): Int =
  if (hasKey(key)) getDouble(key).toInt() else 0

private fun ReadableMap.longOf(key: String): Long =
  if (hasKey(key)) getDouble(key).toLong() else 0L

private fun ReadableMap?.toTodayDataMap(): DataMap = DataMap().apply {
  putInt(WearProtocol.KEY_STEPS, this@toTodayDataMap?.intOf("steps") ?: 0)
  putInt(
    WearProtocol.KEY_DISTANCE_METERS,
    this@toTodayDataMap?.intOf("distanceMeters") ?: 0,
  )
  putInt(WearProtocol.KEY_CALORIES, this@toTodayDataMap?.intOf("calories") ?: 0)
  putInt(WearProtocol.KEY_GOAL_STEPS, this@toTodayDataMap?.intOf("goalSteps") ?: 0)
}

private fun ReadableArray?.toRoomDataMaps(): ArrayList<DataMap> {
  val rooms = ArrayList<DataMap>()
  if (this == null) {
    return rooms
  }
  for (index in 0 until size()) {
    val room = getMap(index) ?: continue
    rooms.add(
      DataMap().apply {
        putLong(WearProtocol.KEY_ROOM_ID, room.longOf("roomId"))
        putString(WearProtocol.KEY_ROOM_NAME, room.getString("name").orEmpty())
        putString(WearProtocol.KEY_ROOM_MODE, room.getString("mode").orEmpty())
        putInt(WearProtocol.KEY_ROOM_MEMBER_COUNT, room.intOf("memberCount"))
        putInt(
          WearProtocol.KEY_ROOM_COMPLETED_MISSIONS,
          room.intOf("completedMissionCount"),
        )
        putInt(WearProtocol.KEY_ROOM_TOTAL_MISSIONS, room.intOf("totalMissionCount"))
        putBoolean(
          WearProtocol.KEY_ROOM_STARTABLE,
          !room.hasKey("startable") || room.getBoolean("startable"),
        )
        room.getString("blockedReason")?.let {
          putString(WearProtocol.KEY_ROOM_BLOCKED_REASON, it)
        }
      },
    )
  }
  return rooms
}

private fun ReadableMap.toSessionDataMap(): DataMap = DataMap().apply {
  putLong(WearProtocol.KEY_ROOM_ID, longOf("roomId"))
  putString(WearProtocol.KEY_SESSION_ROOM_NAME, getString("roomName").orEmpty())
  putBoolean(WearProtocol.KEY_SESSION_STARTED, hasKey("started") && getBoolean("started"))
  putBoolean(WearProtocol.KEY_SESSION_PAUSED, hasKey("paused") && getBoolean("paused"))
  putInt(WearProtocol.KEY_SESSION_ELAPSED_SECONDS, intOf("elapsedSeconds"))
  putInt(WearProtocol.KEY_STEPS, intOf("steps"))
  putInt(WearProtocol.KEY_DISTANCE_METERS, intOf("distanceMeters"))
  putInt(WearProtocol.KEY_CALORIES, intOf("calories"))
}
