import React, {useRef, useEffect, useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {WebView} from 'react-native-webview';

interface MarkerData {
  lat: number;
  lng: number;
  title?: string;
  emoji?: string;
  label?: string;
}

interface RoutePoint {
  lat: number;
  lng: number;
}

interface OSMMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  markers?: MarkerData[];
  routePath?: RoutePoint[];
  darkMode?: boolean;
  showUserLocation?: boolean;
  style?: any;
}

const OSMMap: React.FC<OSMMapProps> = ({
  latitude,
  longitude,
  zoom = 14,
  markers = [],
  routePath = [],
  darkMode = false,
  showUserLocation = false,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);

  // Generate the Leaflet HTML
  const getMapHTML = useCallback(() => {
    const tileUrl = darkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

    const markersJS = markers
      .map(
        (m, idx) => `
      var marker_${idx} = L.marker([${m.lat}, ${m.lng}], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div class="marker-pin"><span class="marker-emoji">${m.emoji || '📍'}</span></div>${m.label ? `<div class="marker-label">${m.label}</div>` : ''}',
          iconSize: [44, 60],
          iconAnchor: [22, 50],
        })
      }).addTo(map)${m.title ? `.bindPopup('${m.title}')` : ''};
      if ('${m.label}' === 'DRIVER' || '${m.title}' === 'Driver') {
        window.driverMarker = marker_${idx};
      }
    `,
      )
      .join('\n');

    const routeJS =
      routePath.length > 1
        ? `
      var routeCoords = [${routePath.map((p) => `[${p.lat}, ${p.lng}]`).join(',')}];
      window._routeLine = L.polyline(routeCoords, {
        color: '#000000',
        weight: 5,
        opacity: 0.9,
        smoothFactor: 1,
      }).addTo(map);
    `
        : '';

    const userLocationJS = showUserLocation
      ? `
      map.locate({setView: false, watch: true, enableHighAccuracy: true});
      var userMarker = null;
      var userCircle = null;
      map.on('locationfound', function(e) {
        if (userMarker) { map.removeLayer(userMarker); map.removeLayer(userCircle); }
        userMarker = L.circleMarker(e.latlng, {
          radius: 8,
          fillColor: '#4285F4',
          color: '#FFFFFF',
          weight: 3,
          fillOpacity: 1,
        }).addTo(map);
        userCircle = L.circle(e.latlng, {
          radius: e.accuracy / 2,
          fillColor: '#4285F4',
          fillOpacity: 0.1,
          color: '#4285F4',
          weight: 1,
        }).addTo(map);
      });
    `
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; }
    #map {
      position: absolute;
      top: 0; bottom: 0; left: 0; right: 0;
      width: 100%; height: 100%;
    }
    .custom-marker { background: none; border: none; text-align: center; }
    .marker-pin {
      width: 44px; height: 44px;
      border-radius: 50%;
      background: #FFFFFF;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      border: 3px solid #10b981;
      margin: 0 auto;
    }
    .marker-emoji { font-size: 22px; line-height: 1; }
    .marker-label {
      font-size: 9px; font-weight: 800; color: #fff;
      background: rgba(0,0,0,0.6); padding: 2px 6px;
      border-radius: 4px; margin-top: 3px;
      text-align: center; letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .leaflet-control-attribution { font-size: 8px !important; opacity: 0.6; }
    ${darkMode ? `
    .leaflet-container { background: #1a3a3a; }
    ` : ''}
  </style>
</head>
  <body>
    <div id="map"></div>
    <script>
      // Forward console logs to React Native
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      console.log = function(...args) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'log', message: args.join(' ')}));
        originalConsoleLog.apply(console, args);
      };
      console.error = function(...args) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', message: args.join(' ')}));
        originalConsoleError.apply(console, args);
      };

      console.log("OSMMap WebView starting script execution");

      function initMap() {
        if (typeof L === 'undefined') {
          setTimeout(initMap, 50);
          return;
        }

        var map = L.map('map', {
          center: [${latitude}, ${longitude}],
          zoom: ${zoom},
          zoomControl: false,
          attributionControl: true,
        });

        L.tileLayer('${tileUrl}', {
          attribution: '${tileAttribution}',
          maxZoom: 19,
        }).addTo(map);

        // Add zoom control to top-right
        L.control.zoom({position: 'topright'}).addTo(map);

        ${markersJS}
        ${routeJS}
        ${userLocationJS}

        // Expose function to update map from RN
        window.updateCenter = function(lat, lng) {
          if (!map) return;
          map.setView([lat, lng], map.getZoom(), {animate: true});
        };

        window.updateDriverMarker = function(lat, lng) {
          if (window.driverMarker) {
            window.driverMarker.setLatLng([lat, lng]);
          }
        };

        window.addRoutePoint = function(lat, lng) {
          if (!map) return;
          if (!window._routeCoords) window._routeCoords = [];
          window._routeCoords.push([lat, lng]);
          if (window._routeLine) map.removeLayer(window._routeLine);
          window._routeLine = L.polyline(window._routeCoords, {
            color: '#000000', weight: 5, opacity: 0.9,
          }).addTo(map);
        };
      }

      initMap();
    </script>
  </body>
</html>`;
  }, [latitude, longitude, zoom, markers, routePath, darkMode, showUserLocation]);

  // We no longer re-render the whole HTML when latitude/longitude updates, 
  // we just inject JS to update it.
  useEffect(() => {
    if (webViewRef.current && latitude && longitude) {
      webViewRef.current.injectJavaScript(
        `if(window.updateCenter) window.updateCenter(${latitude}, ${longitude}); if(window.updateDriverMarker) window.updateDriverMarker(${latitude}, ${longitude}); if(window.addRoutePoint) window.addRoutePoint(${latitude}, ${longitude}); true;`,
      );
    }
  }, [latitude, longitude]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{
          html: getMapHTML(),
          baseUrl: 'https://openstreetmap.org/',
        }}
        userAgent="MetroMile-Mobile-App"
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        mixedContentMode="always"
        originWhitelist={['*']}
        androidLayerType="software"
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'error') console.error('OSM WebView Error: ', data.message);
            else console.log('OSM WebView: ', data.message);
          } catch (e) {
            console.log('OSM WebView Raw: ', event.nativeEvent.data);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, overflow: 'hidden', backgroundColor: '#e5e7eb'},
  webview: {flex: 1, backgroundColor: 'transparent'},
});

export default OSMMap;
