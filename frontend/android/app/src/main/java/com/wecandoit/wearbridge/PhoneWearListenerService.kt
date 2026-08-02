package com.wecandoit.wearbridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import com.google.android.gms.wearable.CapabilityInfo
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import com.wecandoit.R
import com.wecandoit.wear.protocol.WearProtocol

private const val TAG = "PhoneWearListener"
private const val CHANNEL_ID = "wear_commands"

/** 앱을 열면 취소해야 해서 모듈 쪽에서도 쓴다. */
internal const val WEAR_COMMAND_NOTIFICATION_ID = 4101

/**
 * 워치가 보낸 명령을 받는 창구.
 *
 * Play 서비스가 알아서 깨우기 때문에, 폰 앱이 완전히 꺼져 있어도 여기까지는
 * 도착한다. 다만 JS가 없으면 세션을 시작할 수 없으므로(산책 세션의 주인은
 * walkSessionStore다) 명령을 큐에 넣고 알림으로 앱을 열어달라고 안내한다.
 * 백그라운드에서 액티비티를 직접 띄우는 건 Android 10부터 막혀 있다.
 */
class PhoneWearListenerService : WearableListenerService() {

  override fun onMessageReceived(messageEvent: MessageEvent) {
    val command = messageEvent.toWearCommand()
    if (command == null) {
      Log.w(TAG, "모르는 경로: ${messageEvent.path}")
      return
    }

    // 상태 재전송 요청은 큐에 쌓을 이유가 없다. JS가 없으면 보낼 상태도 없고,
    // 나중에 앱을 열면 어차피 처음부터 다시 보낸다.
    if (command.type == WearCommandType.REQUEST_SYNC) {
      WearCommandDispatcher.emitIfRunning(this, command)
      return
    }

    PendingWearCommands.enqueue(this, command, System.currentTimeMillis())
    if (!WearCommandDispatcher.emitIfRunning(this, command)) {
      notifyToOpenApp(command)
    }
  }

  private fun notifyToOpenApp(command: WearCommand) {
    val manager = NotificationManagerCompat.from(this)
    if (!manager.areNotificationsEnabled()) {
      Log.i(TAG, "알림이 꺼져 있어 안내하지 못했다: ${command.type}")
      return
    }
    manager.createNotificationChannel(
      NotificationChannel(
        CHANNEL_ID,
        "워치 연동",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "워치에서 보낸 산책 시작·종료를 폰에서 이어가야 할 때 알려줍니다."
      },
    )

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return
    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val text = when (command.type) {
      WearCommandType.START_WALK -> "워치에서 산책을 시작했어요. 탭해서 이어가기"
      WearCommandType.END_WALK -> "워치에서 산책을 종료했어요. 탭해서 기록 저장하기"
      else -> return
    }

    val notification = Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_notification_walk)
      .setContentTitle("산책")
      .setContentText(text)
      .setContentIntent(contentIntent)
      .setAutoCancel(true)
      .build()

    // POST_NOTIFICATIONS를 아직 안 받았을 수 있다. areNotificationsEnabled로
    // 걸러도 권한 체크는 별개라, 던지는 대신 조용히 넘어간다.
    runCatching { manager.notify(WEAR_COMMAND_NOTIFICATION_ID, notification) }
      .onFailure { Log.w(TAG, "알림 표시 실패", it) }
  }

  /**
   * 워치 앱이 깔리거나 지워지거나, 손목에서 멀어졌다 돌아올 때 온다. JS가
   * 연결 여부를 다시 확인하고 최신 상태를 밀 수 있도록 신호만 보낸다.
   */
  override fun onCapabilityChanged(capabilityInfo: CapabilityInfo) {
    if (capabilityInfo.name != WearProtocol.CAPABILITY_WATCH_APP) {
      return
    }
    ReactEventEmitter.of(this)?.emit(
      WearCommandDispatcher.EVENT_CONNECTION_CHANGED,
      capabilityInfo.nodes.isNotEmpty().toString(),
    )
  }
}

/** 워치 -> 폰 명령 종류. JS에도 같은 문자열로 넘어간다. */
object WearCommandType {
  const val START_WALK = "start-walk"
  const val END_WALK = "end-walk"
  const val REQUEST_SYNC = "request-sync"
}

private fun MessageEvent.toWearCommand(): WearCommand? = when (path) {
  WearProtocol.PATH_COMMAND_START_WALK -> {
    val roomId = String(data).trim().toLongOrNull()
    if (roomId == null) {
      Log.w(TAG, "방 ID를 못 읽었다: ${String(data)}")
      null
    } else {
      WearCommand(WearCommandType.START_WALK, roomId)
    }
  }

  WearProtocol.PATH_COMMAND_END_WALK -> WearCommand(WearCommandType.END_WALK, null)

  WearProtocol.PATH_COMMAND_REQUEST_SYNC -> WearCommand(WearCommandType.REQUEST_SYNC, null)

  else -> null
}

/** 서비스와 네이티브 모듈이 공유하는, JS로 신호를 보내는 통로. */
object WearCommandDispatcher {

  /** JS가 구독하는 이벤트 이름. shared/lib/wearBridge.ts와 맞춰야 한다. */
  const val EVENT_COMMAND = "WearBridge:command"

  /** 워치 앱이 닿았다/끊겼다. 페이로드는 "true"/"false". */
  const val EVENT_CONNECTION_CHANGED = "WearBridge:connectionChanged"

  /**
   * RN이 살아 있으면 신호를 보내고 true. 이벤트는 "큐를 확인하라"는 뜻일 뿐이고
   * 실제 명령은 JS가 consumePendingCommands로 가져간다(중복/유실 방지).
   */
  fun emitIfRunning(context: Context, command: WearCommand): Boolean {
    val emitter = ReactEventEmitter.of(context) ?: return false
    emitter.emit(EVENT_COMMAND, command.type)
    return true
  }
}
