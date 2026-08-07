package com.wecandoit.wearbridge

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Rect
import android.net.Uri
import android.util.Log
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

private const val TAG = "CharacterComposer"
private const val OUTPUT_SIZE_PX = 256
private const val CONNECT_TIMEOUT_MS = 5000
private const val READ_TIMEOUT_MS = 5000

/**
 * 캐릭터 레이어 여러 장을 PNG 한 장으로 합친다.
 *
 * 워치에 URL을 넘겨 직접 받게 하지 않는 이유가 두 가지다. 개발 환경의 백엔드는
 * `adb reverse`로 폰에만 열려 있어 워치가 아예 못 받고, 기본 캐릭터 폴백처럼
 * 레이어가 서버 URL이 아니라 앱에 번들된 이미지인 경우도 있다. 폰에서 합쳐
 * 보내면 두 경우 다 똑같이 동작한다.
 *
 * 워치 화면이 작아 결과물은 [OUTPUT_SIZE_PX] 정사각형으로 고정한다. Data Layer
 * Asset은 크면 전송이 느려지는데, 워치에서는 이 이상 커봐야 보이지 않는다.
 */
class CharacterComposer(private val context: Context) {

  /**
   * [sources]는 아래에 깔릴 것부터 순서대로다(기본 캐릭터 -> 하의 -> 상의 -> 모자).
   * 한 장이라도 못 읽으면 그 레이어만 건너뛴다 — 아이템 하나 때문에 캐릭터가
   * 통째로 안 보이는 것보다 낫다. 전부 실패하면 null.
   *
   * 기본 캐릭터(첫 레이어)만은 못 읽었을 때 [baseFallback](번들 에셋)으로
   * 갈아탄다. 서버 이미지가 죽으면(개발 서버의 /uploads 유실 등) 기본 캐릭터가
   * 통째로 빠져 몸통 없는 옷만 남거나, 아이템이 없을 땐 전송 자체가 실패했다.
   */
  fun composePng(sources: List<String>, baseFallback: String? = null): ByteArray? {
    val layers = sources.mapIndexedNotNull { index, source ->
      val bitmap = loadBitmap(source)
      if (bitmap != null) {
        return@mapIndexedNotNull bitmap
      }
      Log.w(TAG, "레이어를 못 읽었다: $source")
      if (index != 0 || baseFallback == null) {
        return@mapIndexedNotNull null
      }
      loadBitmap(baseFallback).also {
        if (it == null) {
          Log.w(TAG, "기본 캐릭터 폴백도 못 읽었다: $baseFallback")
        }
      }
    }
    if (layers.isEmpty()) {
      return null
    }

    val canvasBitmap = Bitmap.createBitmap(
      OUTPUT_SIZE_PX,
      OUTPUT_SIZE_PX,
      Bitmap.Config.ARGB_8888,
    )
    val canvas = Canvas(canvasBitmap)
    val destination = Rect(0, 0, OUTPUT_SIZE_PX, OUTPUT_SIZE_PX)
    layers.forEach { layer ->
      // 레이어들은 폰에서도 같은 사각형에 겹쳐 그린다(CharacterLayers.tsx).
      // 원본 크기가 서로 달라도 같은 사각형으로 늘려야 위치가 맞는다.
      canvas.drawBitmap(layer, null, destination, null)
      layer.recycle()
    }

    return ByteArrayOutputStream().use { stream ->
      canvasBitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
      canvasBitmap.recycle()
      stream.toByteArray()
    }
  }

  /**
   * JS가 `Image.resolveAssetSource()`로 얻어 넘긴 값을 비트맵으로 바꾼다.
   * 세 가지가 다 들어올 수 있다.
   *
   *   http(s)://...            서버에 올라간 아이템 이미지, 개발 중 Metro가 주는 번들 에셋
   *   file:// | content://     로컬 파일
   *   그 외(예: character_male) 릴리스 빌드에서 번들 에셋이 들어간 drawable 리소스 이름
   */
  private fun loadBitmap(source: String): Bitmap? = runCatching {
    when {
      source.startsWith("http://") || source.startsWith("https://") -> {
        openHttpStream(source)?.use { BitmapFactory.decodeStream(it) }
      }

      source.startsWith("file://") || source.startsWith("content://") -> {
        context.contentResolver.openInputStream(Uri.parse(source))
          ?.use { BitmapFactory.decodeStream(it) }
      }

      source.startsWith("/") -> {
        File(source).inputStream().use { BitmapFactory.decodeStream(it) }
      }

      else -> decodeDrawableResource(source)
    }
  }.getOrElse { throwable ->
    Log.w(TAG, "레이어 디코딩 실패: $source", throwable)
    null
  }

  private fun openHttpStream(url: String): InputStream? {
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = CONNECT_TIMEOUT_MS
    connection.readTimeout = READ_TIMEOUT_MS
    connection.instanceFollowRedirects = true
    if (connection.responseCode !in 200..299) {
      Log.w(TAG, "레이어 응답 코드 ${connection.responseCode}: $url")
      connection.disconnect()
      return null
    }
    return connection.inputStream
  }

  private fun decodeDrawableResource(name: String): Bitmap? {
    @Suppress("DiscouragedApi") // 리소스 이름을 빌드 시점에 알 수 없다(JS가 정한다).
    val resourceId = context.resources.getIdentifier(name, "drawable", context.packageName)
    if (resourceId == 0) {
      return null
    }
    return BitmapFactory.decodeResource(context.resources, resourceId)
  }
}
