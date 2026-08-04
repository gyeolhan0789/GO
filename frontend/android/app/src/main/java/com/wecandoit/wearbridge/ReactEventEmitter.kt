package com.wecandoit.wearbridge

import android.content.Context
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

private const val TAG = "ReactEventEmitter"

/**
 * 서비스처럼 RN 밖에서 도는 코드가 JS로 이벤트를 보낼 때 쓴다.
 *
 * 폰 앱이 꺼져 있으면 ReactContext 자체가 없다. 그 경우 null을 돌려주고,
 * 호출부가 알림 같은 다른 길을 택하게 한다.
 */
class ReactEventEmitter private constructor(private val reactContext: ReactContext) {

  fun emit(eventName: String, payload: String) {
    runCatching {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, payload)
    }.onFailure { Log.w(TAG, "이벤트 전달 실패: $eventName", it) }
  }

  companion object {
    fun of(context: Context): ReactEventEmitter? {
      val application = context.applicationContext as? ReactApplication ?: return null
      val reactContext = application.reactHost?.currentReactContext ?: return null
      if (!reactContext.hasActiveReactInstance()) {
        return null
      }
      return ReactEventEmitter(reactContext)
    }
  }
}
