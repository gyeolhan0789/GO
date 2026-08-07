package com.wecandoit

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Application
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(com.wecandoit.samsunghealth.SamsungHealthPackage())
          add(com.wecandoit.stepsensor.StepSensorPackage())
          add(com.wecandoit.walktracking.WalkTrackingPackage())
          add(com.wecandoit.wearbridge.WearBridgePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createFcmNotificationChannel()
    loadReactNative(this)
  }

  private fun createFcmNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = getSystemService(NotificationManager::class.java)
    val channelId = getString(R.string.fcm_notification_channel_id)
    if (manager.getNotificationChannel(channelId) != null) return

    val channel = NotificationChannel(
      channelId,
      getString(R.string.fcm_notification_channel_name),
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = getString(R.string.fcm_notification_channel_description)
      enableVibration(true)
    }
    manager.createNotificationChannel(channel)
  }
}
