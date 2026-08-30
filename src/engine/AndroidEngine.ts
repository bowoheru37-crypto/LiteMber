/**
 * AndroidEngine.ts
 * Android Native Integration & Unisoc T606 Optimization Profile Engine
 * Generates Native Android WebView Gradle projects and handles Android OS Haptic Vibration & Performance Governors.
 */

import { GameProject } from '../types/engine';

export class AndroidEngine {
  /**
   * Check if device is low-end mobile hardware (e.g. Unisoc T606 / itel A70 / <=4GB RAM)
   */
  public static isLowEndDevice(): boolean {
    if (typeof window === 'undefined') return true;
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    return memory <= 4 || cores <= 4 || /Android/i.test(navigator.userAgent);
  }

  /**
   * Triggers native Android device haptic vibration feedback
   */
  public static triggerHaptic(pattern: number | number[] = 15): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silent fallback for unsupported WebViews
      }
    }
  }

  /**
   * Generates Android Manifest XML configuration
   */
  public static generateAndroidManifest(projectName: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.liteengine.${projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:label="${projectName}"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
  }

  /**
   * Generates MainActivity.java for Android WebView Wrapper
   */
  public static generateMainActivityJava(projectName: string): string {
    const pkg = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `package com.liteengine.${pkg};

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.app.Activity;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }
}`;
  }

  /**
   * Applies Android Go / Unisoc T606 Hardware Acceleration Profile settings
   */
  public static getItelA70ProfileSettings() {
    return {
      chipset: 'Unisoc T606 (8 Cores: 2x Cortex-A75 + 6x Cortex-A55)',
      gpu: 'Mali-G57 MP1',
      ramCapacity: '3GB / 4GB LPDDR4X',
      targetFPS: 60,
      maxParticles: 300,
      typedBufferAllocKb: 128,
      useSpatialHash: true,
      audioSynthPrebake: true,
      batterySaveThrottling: true,
    };
  }
}
