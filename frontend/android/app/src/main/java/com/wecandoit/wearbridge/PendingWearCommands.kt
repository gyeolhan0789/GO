package com.wecandoit.wearbridge

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

private const val TAG = "PendingWearCommands"
private const val PREFS_NAME = "wear_bridge"
private const val KEY_QUEUE = "pending_commands"

/**
 * 시작은 오래된 걸 실행하면 안 된다. 워치에서 누르고 폰을 30분 뒤에 열었는데
 * 그때 세션을 시작하면 시작 시각이 통째로 틀어진다.
 */
private const val START_MAX_AGE_MS = 5 * 60 * 1000L

/**
 * 종료는 반대로 넉넉히 잡는다. 늦게 끝내도 그동안 걸은 건 실제로 걸은 것이고,
 * 버리면 산책이 안 끝난 채로 남아 사용자가 직접 폰에서 끝내야 한다.
 */
private const val DEFAULT_MAX_AGE_MS = 60 * 60 * 1000L

private fun maxAgeOf(type: String) =
  if (type == WearCommandType.START_WALK) START_MAX_AGE_MS else DEFAULT_MAX_AGE_MS

/** 워치가 보낸 명령 하나. [roomId]는 start-walk에만 있다. */
data class WearCommand(val type: String, val roomId: Long?)

/**
 * 워치 명령을 JS가 받아갈 때까지 담아두는 큐.
 *
 * 명령은 폰 앱이 완전히 꺼져 있어도 도착한다(Play 서비스가
 * [PhoneWearListenerService]를 깨운다). 그때는 JS가 없으니 여기에 쌓아두고,
 * RN이 뜬 뒤 consume으로 가져간다.
 *
 * RN이 살아 있을 때도 항상 여기를 거친다. "이벤트로 받는 길"과 "부팅 때
 * 훑어가는 길"이 따로 놀면 같은 명령을 두 번 처리하거나 한 번도 처리하지
 * 못하는 경우가 생기기 때문이다. 이벤트는 "큐를 확인하라"는 신호일 뿐이다.
 */
object PendingWearCommands {

  @Synchronized
  fun enqueue(context: Context, command: WearCommand, nowMs: Long) {
    val queue = read(context)
    queue.put(
      JSONObject().apply {
        put("type", command.type)
        command.roomId?.let { put("roomId", it) }
        put("at", nowMs)
      },
    )
    write(context, queue)
  }

  /** 큐를 비우면서 유효한 것만 돌려준다. */
  @Synchronized
  fun consume(context: Context, nowMs: Long): List<WearCommand> {
    val queue = read(context)
    write(context, JSONArray())

    return (0 until queue.length()).mapNotNull { index ->
      val entry = queue.optJSONObject(index) ?: return@mapNotNull null
      val type = entry.optString("type")
      if (nowMs - entry.optLong("at") > maxAgeOf(type)) {
        Log.i(TAG, "오래된 명령을 버린다: $type")
        return@mapNotNull null
      }
      WearCommand(
        type = type,
        roomId = if (entry.has("roomId")) entry.optLong("roomId") else null,
      )
    }
  }

  private fun read(context: Context): JSONArray {
    val raw = prefs(context).getString(KEY_QUEUE, null) ?: return JSONArray()
    return runCatching { JSONArray(raw) }.getOrElse {
      Log.w(TAG, "큐를 읽지 못해 비운다", it)
      JSONArray()
    }
  }

  private fun write(context: Context, queue: JSONArray) {
    prefs(context).edit().putString(KEY_QUEUE, queue.toString()).apply()
  }

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
