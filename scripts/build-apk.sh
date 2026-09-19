#!/bin/bash
set -e

echo "=== Compiling Web Assets ==="
npm run build

BUILD_DIR="/tmp/android-build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"/{src/com/wlsports/groups,res/values,res/drawable,assets,bin,gen}

echo "=== Copying Web App into Assets ==="
cp -r dist/* "$BUILD_DIR/assets/"

echo "=== Copying Icons ==="
cp public/pwa-192x192.png "$BUILD_DIR/res/drawable/ic_launcher.png"

echo "=== Generating strings.xml ==="
cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">WLSPORTS</string>
</resources>
EOF

echo "=== Generating AndroidManifest.xml ==="
cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.wlsports.groups"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/ic_launcher"
        android:allowBackup="true"
        android:theme="@android:style/Theme.NoTitleBar">
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

echo "=== Generating MainActivity.java ==="
cat << 'EOF' > "$BUILD_DIR/src/com/wlsports/groups/MainActivity.java"
package com.wlsports.groups;

import android.app.Activity;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
EOF

echo "=== Generating R.java with aapt ==="
aapt package -f -m \
    -J "$BUILD_DIR/gen" \
    -M "$BUILD_DIR/AndroidManifest.xml" \
    -S "$BUILD_DIR/res" \
    -I /opt/android/android.jar

echo "=== Compiling Java code ==="
javac -source 8 -target 8 \
    -bootclasspath /opt/android/android.jar \
    -d "$BUILD_DIR/bin" \
    "$BUILD_DIR/gen/com/wlsports/groups/R.java" \
    "$BUILD_DIR/src/com/wlsports/groups/MainActivity.java"

echo "=== Converting bytecode to classes.dex ==="
dx --dex --output="$BUILD_DIR/classes.dex" "$BUILD_DIR/bin"

echo "=== Packaging initial APK ==="
aapt package -f \
    -M "$BUILD_DIR/AndroidManifest.xml" \
    -S "$BUILD_DIR/res" \
    -A "$BUILD_DIR/assets" \
    -I /opt/android/android.jar \
    -F "$BUILD_DIR/unaligned.apk"

echo "=== Adding classes.dex to APK ==="
cd "$BUILD_DIR"
aapt add unaligned.apk classes.dex

echo "=== Zipaligning APK ==="
zipalign -f -p 4 unaligned.apk aligned.apk

echo "=== Generating keystore if not exists ==="
KEYSTORE="/opt/android/release.keystore"
if [ ! -f "$KEYSTORE" ]; then
    keytool -genkeypair -v \
        -keystore "$KEYSTORE" \
        -alias wlsports \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass android123 \
        -keypass android123 \
        -dname "CN=WLSPORTS, OU=App, O=WLSPORTS, L=City, S=State, C=CO"
fi

echo "=== Signing APK with apksigner ==="
apksigner sign \
    --ks "$KEYSTORE" \
    --ks-key-alias wlsports \
    --ks-pass pass:android123 \
    --key-pass pass:android123 \
    --out "/tmp/WLSPORTS-Groups.apk" \
    aligned.apk

echo "=== Verifying APK ==="
apksigner verify "/tmp/WLSPORTS-Groups.apk"

echo "=== Copying finished APK to public and dist ==="
mkdir -p /public /dist
cp /tmp/WLSPORTS-Groups.apk public/WLSPORTS-Groups.apk
cp /tmp/WLSPORTS-Groups.apk dist/WLSPORTS-Groups.apk

echo "=== APK Build Successful! ==="
ls -lh public/WLSPORTS-Groups.apk
