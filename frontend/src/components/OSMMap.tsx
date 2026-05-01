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
      .map((m, idx) => {
        const isDriver = m.label === 'DRIVER' || m.title === 'Driver';
        const driverClasses = isDriver ? 'driver-pin driver-inner' : '';
        const labelHtml = m.label ? `<div class="marker-label">${m.label}</div>` : '';
        const popupHtml = m.title ? `.bindPopup('${m.title}')` : '';
        
        return `
      var marker_${idx} = L.marker([${m.lat}, ${m.lng}], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div class="marker-pin ${driverClasses}"><span class="marker-emoji">${m.emoji || '📍'}</span></div>${labelHtml}',
          iconSize: [44, 60],
          iconAnchor: [22, 50],
        })
      }).addTo(map)${popupHtml};
      if (${isDriver}) {
        window.driverMarker = marker_${idx};
      }
    `;
      })
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
      border: 3px solid #10b981; /* Standard green for other markers */
      margin: 0 auto;
    }
    .driver-pin {
      border: 3px solid #39FF14; /* Neon green for the driver */
      box-shadow: 0 0 10px #39FF14;
    }
    .marker-emoji { font-size: 22px; line-height: 1; }
    .marker-label {
      font-size: 9px; font-weight: 800; color: #fff;
      background: rgba(0,0,0,0.6); padding: 2px 6px;
      border-radius: 4px; margin-top: 3px;
      text-align: center; letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .driver-inner {
      transition: transform 0.5s ease-out;
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
      window.onerror = function(message, source, lineno, colno, error) {
        console.error("Global JS Error: ", message, " at line ", lineno);
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
          map.setView([lat, lng], map.getZoom(), {animate: true, duration: 1.5});
        };

        function getBearing(lat1, lon1, lat2, lon2) {
          var dLon = (lon2 - lon1) * Math.PI / 180;
          var l1 = lat1 * Math.PI / 180;
          var l2 = lat2 * Math.PI / 180;
          var y = Math.sin(dLon) * Math.cos(l2);
          var x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
          var brng = Math.atan2(y, x);
          return ((brng * 180 / Math.PI) + 360) % 360;
        }

        window.updateDriverMarker = function(lat, lng) {
          if (window.driverMarker) {
            var oldLatLng = window.driverMarker.getLatLng();
            var newLatLng = L.latLng(lat, lng);
            
            // Only animate if distance is significant (> 0.5 meters)
            if (map.distance(oldLatLng, newLatLng) > 0.5) {
                var bearing = getBearing(oldLatLng.lat, oldLatLng.lng, lat, lng);
                var innerEl = window.driverMarker.getElement() ? window.driverMarker.getElement().querySelector('.driver-inner') : null;
                
                if (innerEl && !isNaN(bearing)) {
                    innerEl.style.transform = 'rotate(' + bearing + 'deg)';
                }
                
                var startLat = oldLatLng.lat;
                var startLng = oldLatLng.lng;
                var startTime = performance.now();
                var duration = 1500; // 1.5s animation
                
                if (window.driverMarker._animId) cancelAnimationFrame(window.driverMarker._animId);
                
                function step(currentTime) {
                    var elapsed = currentTime - startTime;
                    var progress = Math.min(elapsed / duration, 1);
                    // easeInOutQuad
                    var easeProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    
                    var currentLat = startLat + (lat - startLat) * easeProgress;
                    var currentLng = startLng + (lng - startLng) * easeProgress;
                    
                    window.driverMarker.setLatLng([currentLat, currentLng]);
                    
                    if (progress < 1) {
                        window.driverMarker._animId = requestAnimationFrame(step);
                    }
                }
                window.driverMarker._animId = requestAnimationFrame(step);
            } else {
                window.driverMarker.setLatLng([lat, lng]);
            }
          }
        };

        window.addRoutePoint = function(lat, lng) {
          if (!map) return;
          if (!window._routeCoords) window._routeCoords = [];
          
          var lastPoint = window._routeCoords[window._routeCoords.length - 1];
          if (lastPoint && lastPoint[0] === lat && lastPoint[1] === lng) return;
          
          window._routeCoords.push([lat, lng]);
          if (window._routeLine) map.removeLayer(window._routeLine);
          
          // Electric Blue inner line
          window._routeLine = L.polyline(window._routeCoords, {
            color: '#00d4ff', weight: 6, opacity: 1, smoothFactor: 1.5,
            lineCap: 'round', lineJoin: 'round'
          }).addTo(map);
          
          // Add a glowing outer line to simulate neon effect
          if (window._routeGlow) map.removeLayer(window._routeGlow);
          window._routeGlow = L.polyline(window._routeCoords, {
            color: '#3b82f6', weight: 12, opacity: 0.4, smoothFactor: 1.5,
            lineCap: 'round', lineJoin: 'round'
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
        androidLayerType="hardware"
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
