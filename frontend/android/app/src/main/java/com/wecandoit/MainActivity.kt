package com.wecandoit

import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.wecandoit.walktracking.WalkTrackingConstants
import com.wecandoit.walktracking.WalkTrackingModule

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "frontend"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /** singleTop이라 앱이 이미 떠있는 상태에서 산책 알림을 탭하면 여기로 들어온다
   * (완전히 꺼진 상태에서의 콜드스타트 복구는 RootNavigator의 스냅샷 하이드레이션이
   * 별도로 처리한다). */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    if (intent.action == WalkTrackingConstants.ACTION_OPEN_WALK_SESSION) {
      WalkTrackingModule.emit(WalkTrackingConstants.EVENT_OPEN_SESSION, null)
    }
  }
}
