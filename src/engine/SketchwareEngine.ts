import JSZip from 'jszip';
import { GameProject } from '../types/engine';

export class SketchwareEngine {
  /**
   * Generates clean package name from project name
   */
  public static getPackageName(projectName: string): string {
    const cleanName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mygame';
    return `com.liteengine.${cleanName}`;
  }

  /**
   * Generates Sketchware Pro project metadata (project file JSON format)
   */
  public static generateProjectMetadata(project: GameProject) {
    const packageName = this.getPackageName(project.name);
    return JSON.stringify(
      {
        sc_id: '601',
        project_name: project.name.replace(/[^a-zA-Z0-9_]/g, '_'),
        app_name: project.name,
        package_name: packageName,
        version_code: '1',
        version_name: '1.0.0',
        my_app_color: '-16744211', // Dark slate theme
        sc_ver: '150',
        created_with: 'LiteEngine 2D Studio',
        target_sdk: '34',
        min_sdk: '21',
      },
      null,
      2
    );
  }

  /**
   * Generates Sketchware Pro AndroidManifest.xml
   */
  public static generateManifestXML(project: GameProject): string {
    const packageName = this.getPackageName(project.name);
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}">

    <!-- Permissions required for WebView Game Runtime & Haptic Feedback -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${project.name}"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|screenSize|screenLayout|smallestScreenSize"
            android:exported="true"
            android:hardwareAccelerated="true"
            android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
  }

  /**
   * Generates MainActivity.java compatible with Sketchware Pro Java Injection
   */
  public static generateMainActivityJava(project: GameProject): string {
    const packageName = this.getPackageName(project.name);
    return `package ${packageName};

import android.app.Activity;
import android.os.Bundle;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.os.Build;
import android.content.Context;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;
import android.view.WindowManager;

/**
 * Sketchware Pro Compatible MainActivity for ${project.name}
 * Optimized for Android WebView Hardware Acceleration & itel A70 / Unisoc T606
 */
public class MainActivity extends Activity {

    private WebView webview;
    private Vibrator vibrator;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Fullscreen Hide Status & Navigation Bar
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        setContentView(R.layout.main);

        vibrator = (Vibrator) getSystemService(Context.VibrATOR_SERVICE);
        webview = findViewById(R.id.webview);

        WebSettings settings = webview.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Hardware Acceleration profile
        webview.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Sketchware Pro JS Bridge
        webview.addJavascriptInterface(new WebAppInterface(), "SketchwareBridge");

        webview.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }
        });

        // Load Game from Assets folder
        webview.loadUrl("file:///android_asset/index.html");
    }

    public class WebAppInterface {
        @JavascriptInterface
        public void vibrate(long milliseconds) {
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(milliseconds);
                }
            }
        }

        @JavascriptInterface
        public String getProjectName() {
            return "${project.name}";
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webview != null) webview.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webview != null) webview.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webview != null) webview.destroy();
        super.onDestroy();
    }
}`;
  }

  /**
   * Generates main.xml layout file for Sketchware Pro
   */
  public static generateLayoutXML(): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="#020617">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</LinearLayout>`;
  }

  /**
   * Generates standalone HTML5 Game asset for Sketchware Pro assets folder
   */
  public static generateStandaloneHTML(project: GameProject): string {
    const projectJson = JSON.stringify(project);
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${project.name} - Sketchware Pro LiteEngine</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; touch-action: none; -webkit-user-select: none; user-select: none; }
    body { background: ${project.world.backgroundColor || '#020617'}; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
    #game-container { position: relative; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
    canvas { width: 100vw; height: 100vh; max-width: 450px; max-height: 800px; background: ${project.world.backgroundColor || '#020617'}; }
    #overlay-score { position: absolute; top: 16px; left: 16px; color: #38bdf8; font-weight: bold; font-size: 18px; text-shadow: 0 2px 4px rgba(0,0,0,0.8); pointer-events: none; }
  </style>
</head>
<body>
  <div id="game-container">
    <canvas id="gameCanvas"></canvas>
    <div id="overlay-score">Skor: 0</div>
  </div>

  <script>
    // Embedded LiteEngine Project Data
    window.GAME_PROJECT = ${projectJson};

    console.log("Sketchware Pro Game Runtime Initialized:", window.GAME_PROJECT.name);

    // Sketchware Native Haptic Bridge Trigger
    function triggerHaptic(duration) {
      if (window.SketchwareBridge && window.SketchwareBridge.vibrate) {
        window.SketchwareBridge.vibrate(duration || 15);
      } else if (navigator.vibrate) {
        navigator.vibrate(duration || 15);
      }
    }

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 360;
    canvas.height = 640;

    let score = 0;
    const scoreEl = document.getElementById('overlay-score');

    function render() {
      ctx.fillStyle = window.GAME_PROJECT.world.backgroundColor || '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render Entities
      if (window.GAME_PROJECT.entities) {
        window.GAME_PROJECT.entities.forEach(ent => {
          ctx.save();
          ctx.fillStyle = ent.color || '#38bdf8';
          ctx.fillRect(ent.x, ent.y, ent.width || 32, ent.height || 32);
          ctx.restore();
        });
      }

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  </script>
</body>
</html>`;
  }

  /**
   * Bundles the entire project into a downloadable Sketchware Pro `.swb` (Zip archive)
   */
  public static async exportSketchwareSWB(project: GameProject): Promise<Blob> {
    const zip = new JSZip();
    const packageName = this.getPackageName(project.name);
    const packagePath = packageName.replace(/\./g, '/');

    // 1. Root Sketchware metadata files
    zip.file('project', this.generateProjectMetadata(project));
    zip.file('AndroidManifest.xml', this.generateManifestXML(project));

    // 2. Assets directory (HTML5 Game bundle)
    const assetsFolder = zip.folder('assets');
    if (assetsFolder) {
      assetsFolder.file('index.html', this.generateStandaloneHTML(project));
      assetsFolder.file('project.json', JSON.stringify(project, null, 2));
    }

    // 3. Java source code directory
    const javaFolder = zip.folder(`java/${packagePath}`);
    if (javaFolder) {
      javaFolder.file('MainActivity.java', this.generateMainActivityJava(project));
    }

    // 4. Resources directory (layout, values)
    const layoutFolder = zip.folder('res/layout');
    if (layoutFolder) {
      layoutFolder.file('main.xml', this.generateLayoutXML());
    }

    const valuesFolder = zip.folder('res/values');
    if (valuesFolder) {
      valuesFolder.file(
        'colors.xml',
        `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#0f172a</color>
    <color name="colorPrimaryDark">#020617</color>
    <color name="colorAccent">#38bdf8</color>
</resources>`
      );
      valuesFolder.file(
        'styles.xml',
        `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="android:Theme.Material.NoActionBar.Fullscreen">
        <item name="android:windowBackground">@color/colorPrimaryDark</item>
    </style>
</resources>`
      );
    }

    // Generate .swb zip blob
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }
}
