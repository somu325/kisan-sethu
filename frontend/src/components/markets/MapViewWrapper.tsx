import { useEffect, useRef, useState, useCallback, type FC } from 'react';
import L from 'leaflet';
import Supercluster from 'supercluster';
import 'leaflet/dist/leaflet.css';
import type { MarketWithDistance } from '../../types/market';
import type { MarketTranslationStrings } from '../../data/i18n/marketsTranslations';
import { Locate, ZoomIn, ZoomOut, Compass, AlertCircle } from 'lucide-react';

interface MapViewWrapperProps {
  markets: MarketWithDistance[];
  selectedMarket: MarketWithDistance | null;
  onSelectMarket: (market: MarketWithDistance) => void;
  userCoords: { lat: number; lng: number } | null;
  onUpdateUserCoords: (coords: { lat: number; lng: number }) => void;
  i18n: MarketTranslationStrings;
}

// Default geographic center of India
const INDIA_CENTER: [number, number] = [22.5, 79.0];
const INITIAL_ZOOM = 4.8;

export const MapViewWrapper: FC<MapViewWrapperProps> = ({
  markets,
  selectedMarket,
  onSelectMarket,
  userCoords,
  onUpdateUserCoords,
  i18n
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const superclusterRef = useRef<Supercluster | null>(null);

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: INDIA_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false, // Custom styled zoom controls
      attributionControl: true
    });

    // Add OpenStreetMap raster tile layer with required attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Layer group for rendered clusters & markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Clean up on unmount
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render clusters and single markers based on current viewport bounds and zoom
  const renderClusters = useCallback(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const cluster = superclusterRef.current;
    if (!map || !markersLayer || !cluster) return;

    markersLayer.clearLayers();

    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];
    const zoom = Math.floor(map.getZoom());

    const clustersAndPoints = cluster.getClusters(bbox, zoom);

    clustersAndPoints.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const isCluster = feature.properties.cluster;

      if (isCluster) {
        const count = feature.properties.point_count;
        const sizeClass = count > 10 ? 'large' : count > 4 ? 'medium' : 'small';

        const clusterIcon = L.divIcon({
          className: 'custom-cluster-wrapper',
          html: `
            <div class="market-cluster-bubble ${sizeClass}">
              <span class="cluster-num">${count}</span>
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        });

        const clusterMarker = L.marker([lat, lng], { icon: clusterIcon });
        clusterMarker.on('click', () => {
          const clusterId = feature.id as number;
          const expansionZoom = Math.min(cluster.getClusterExpansionZoom(clusterId), 17);
          map.flyTo([lat, lng], expansionZoom, { duration: 0.8 });
        });

        markersLayer.addLayer(clusterMarker);
      } else {
        // Individual Market Pin
        const market = feature.properties.market as MarketWithDistance;
        const isApmc = market.type === 'APMC';
        const isSelected = selectedMarket?.id === market.id;

        const pinIcon = L.divIcon({
          className: 'custom-marker-wrapper',
          html: `
            <div class="custom-market-pin ${isApmc ? 'apmc' : 'mandi'} ${isSelected ? 'selected' : ''}">
              <div class="pin-badge-icon">
                ${isApmc ? '🏛️' : '🌾'}
              </div>
              <div class="pin-tag-label">
                <span class="pin-name">${market.name.split(' ')[0]}</span>
                ${market.distanceKm !== undefined ? `<span class="pin-dist">${market.distanceKm}km</span>` : ''}
              </div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 38]
        });

        const marketMarker = L.marker([lat, lng], { icon: pinIcon });
        marketMarker.on('click', () => {
          onSelectMarket(market);
        });

        markersLayer.addLayer(marketMarker);
      }
    });
  }, [selectedMarket, onSelectMarket]);

  // Update and Index Supercluster whenever markets prop changes
  useEffect(() => {
    const cluster = new Supercluster({
      radius: 65,
      maxZoom: 15,
      minPoints: 2
    });

    const geoJsonFeatures: GeoJSON.Feature<GeoJSON.Point, { market: MarketWithDistance }>[] =
      markets.map((market) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [market.longitude, market.latitude]
        },
        properties: {
          market
        }
      }));

    cluster.load(geoJsonFeatures);
    superclusterRef.current = cluster;

    renderClusters();
  }, [markets, renderClusters]);

  // Re-render markers on map move or zoom
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.on('moveend', renderClusters);
    map.on('zoomend', renderClusters);

    return () => {
      map.off('moveend', renderClusters);
      map.off('zoomend', renderClusters);
    };
  }, [renderClusters]);

  // Center on selected market if changed externally
  useEffect(() => {
    if (!selectedMarket || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(
      [selectedMarket.latitude, selectedMarket.longitude],
      Math.max(mapInstanceRef.current.getZoom(), 11),
      { duration: 0.7 }
    );
  }, [selectedMarket]);

  // Render User Location Pin with pulse effect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userCoords) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-gps-marker-wrapper',
        html: `
          <div class="user-pulse-container">
            <div class="user-pulse-core"></div>
            <div class="user-pulse-ring"></div>
            <div class="user-gps-tag">📍 You</div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const userMarker = L.marker([userCoords.lat, userCoords.lng], {
        icon: userIcon,
        zIndexOffset: 1000
      }).addTo(map);

      userMarkerRef.current = userMarker;
    }
  }, [userCoords]);

  // "My Location" GPS Button Handler
  const handleMyLocationClick = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoNotice(i18n.locationPermissionDenied);
      return;
    }

    setIsLocating(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onUpdateUserCoords(coords);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 10, { duration: 1.2 });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation denied or error:', err.message);
        setGeoNotice(i18n.locationPermissionDenied);
        setTimeout(() => setGeoNotice(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetView = () => {
    mapInstanceRef.current?.flyTo(INDIA_CENTER, INITIAL_ZOOM, { duration: 1 });
  };

  return (
    <div className="map-view-wrapper-container">
      {/* Real Leaflet OpenStreetMap Canvas */}
      <div ref={mapContainerRef} className="leaflet-map-canvas" />

      {/* Floating GPS and Zoom Controls */}
      <div className="map-floating-action-buttons">
        <button
          type="button"
          onClick={handleMyLocationClick}
          className={`map-floating-btn locate ${isLocating ? 'locating' : ''}`}
          title={i18n.myLocationBtn}
          aria-label={i18n.myLocationBtn}
        >
          <Locate size={18} />
          {isLocating && <span className="locating-spinner" />}
        </button>

        <button
          type="button"
          onClick={handleResetView}
          className="map-floating-btn reset"
          title="Reset to India View"
          aria-label="Reset India View"
        >
          <Compass size={18} />
        </button>

        <div className="zoom-btn-group">
          <button
            type="button"
            onClick={handleZoomIn}
            className="map-floating-btn zoom"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="map-floating-btn zoom"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
        </div>
      </div>

      {/* Geolocation Notice Toast */}
      {geoNotice && (
        <div className="geo-permission-toast" role="alert">
          <AlertCircle size={16} />
          <span>{geoNotice}</span>
        </div>
      )}
    </div>
  );
};
