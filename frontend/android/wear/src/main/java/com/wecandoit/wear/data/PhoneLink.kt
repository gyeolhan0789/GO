package com.wecandoit.wear.data

import android.content.Context
import android.graphics.BitmapFactory
import android.os.SystemClock
import android.util.Log
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataItem
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.wecandoit.wear.protocol.WearProtocol
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.mapNotNull
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

private const val TAG = "PhoneLink"

/** 워치가 폰에 보낼 수 있는 명령. 응답은 없고, 결과는 폰이 새 상태를 밀어줘야 보인다. */
sealed interface PhoneCommand {
  val path: String
  val payload: ByteArray

  data class StartWalk(val roomId: Long) : PhoneCommand {
    override val path = WearProtocol.PATH_COMMAND_START_WALK
    override val payload: ByteArray get() = roomId.toString().toByteArray()
  }

  data object EndWalk : PhoneCommand {
    override val path = WearProtocol.PATH_COMMAND_END_WALK
    override val payload = ByteArray(0)
  }

  data object RequestSync : PhoneCommand {
    override val path = WearProtocol.PATH_COMMAND_REQUEST_SYNC
    override val payload = ByteArray(0)
  }
}

/** 폰이 보내온 것들. 두 경로가 갱신 주기가 달라 따로 흘려보낸다. */
sealed interface PhoneUpdate {
  data class State(val state: PhoneState) : PhoneUpdate
  data class Character(val image: ImageBitmap?) : PhoneUpdate
}

/**
 * Data Layer 한 겹 감싸기. 화면과 ViewModel은 Play 서비스 타입을 몰라도 되게 한다.
 *
 * 폰이 보내는 상태는 DataClient(마지막 값이 남는다), 워치가 보내는 명령은
 * MessageClient(1회성)를 쓴다. 자세한 이유는 WearProtocol 주석에 있다.
 */
class PhoneLink(context: Context) {

  private val appContext = context.applicationContext
  private val dataClient = Wearable.getDataClient(appContext)
  private val messageClient = Wearable.getMessageClient(appContext)
  private val nodeClient = Wearable.getNodeClient(appContext)

  /** 폰이 붙어 있는지. 없으면 명령을 보내도 아무 일도 일어나지 않는다. */
  suspend fun isPhoneConnected(): Boolean = runCatching {
    nodeClient.connectedNodes.await().isNotEmpty()
  }.getOrElse { throwable ->
    Log.w(TAG, "연결된 노드를 못 읽었다", throwable)
    false
  }

  /**
   * 이미 워치에 남아 있는 마지막 상태를 읽는다. 앱을 켜자마자 한 번 호출해서
   * 폰의 응답을 기다리지 않고 화면을 채운다.
   */
  suspend fun readCached(): List<PhoneUpdate> = withContext(Dispatchers.IO) {
    runCatching {
      val buffer = dataClient.dataItems.await()
      try {
        buffer.mapNotNull { toUpdate(it) }
      } finally {
        buffer.release()
      }
    }.getOrElse { throwable ->
      Log.w(TAG, "저장된 DataItem을 못 읽었다", throwable)
      emptyList()
    }
  }

  /** 폰이 상태를 밀 때마다 흘려보낸다. 구독을 멈추면 리스너도 해제된다. */
  fun updates(): Flow<PhoneUpdate> = callbackFlow {
    val listener = DataClient.OnDataChangedListener { events: DataEventBuffer ->
      // 콜백에서 버퍼를 놓아줘야 하니 필요한 것만 freeze로 복사해두고,
      // Asset 디코딩 같은 무거운 일은 아래 mapNotNull에서 한다.
      val changed = events
        .filter { it.type == DataEvent.TYPE_CHANGED }
        .map { it.dataItem.freeze() }
      events.release()
      changed.forEach { trySend(it) }
    }
    dataClient.addListener(listener)
    awaitClose { dataClient.removeListener(listener) }
  }.mapNotNull { item -> toUpdate(item) }

  /** 실패해도 던지지 않는다. 폰이 꺼져 있거나 멀어졌을 때가 정상 경로다. */
  suspend fun send(command: PhoneCommand): Boolean = withContext(Dispatchers.IO) {
    runCatching {
      val nodes = nodeClient.connectedNodes.await()
      if (nodes.isEmpty()) {
        return@withContext false
      }
      nodes.forEach { node ->
        messageClient.sendMessage(node.id, command.path, command.payload).await()
      }
      true
    }.getOrElse { throwable ->
      Log.w(TAG, "명령 전송 실패: ${command.path}", throwable)
      false
    }
  }

  private suspend fun toUpdate(item: DataItem): PhoneUpdate? = withContext(Dispatchers.IO) {
    when (item.uri.path) {
      WearProtocol.PATH_STATE -> {
        val map = DataMapItem.fromDataItem(item).dataMap
        PhoneUpdate.State(map.toPhoneState(SystemClock.elapsedRealtime()))
      }

      WearProtocol.PATH_CHARACTER -> PhoneUpdate.Character(readCharacterImage(item))

      else -> null
    }
  }

  /** Asset 본문은 별도 요청으로 받아와야 한다(DataItem에는 참조만 들어 있다). */
  private suspend fun readCharacterImage(item: DataItem): ImageBitmap? {
    val asset = DataMapItem.fromDataItem(item).dataMap
      .getAsset(WearProtocol.ASSET_CHARACTER_IMAGE)
      ?: return null

    return runCatching {
      dataClient.getFdForAsset(asset).await().inputStream.use { stream ->
        BitmapFactory.decodeStream(stream)?.asImageBitmap()
      }
    }.getOrElse { throwable ->
      Log.w(TAG, "캐릭터 이미지를 못 읽었다", throwable)
      null
    }
  }
}
