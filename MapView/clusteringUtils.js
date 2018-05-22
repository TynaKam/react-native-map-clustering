import geoViewport from '@mapbox/geo-viewport';

export const getBounds = region => [
    region.longitude - region.longitudeDelta,
    region.latitude - region.latitudeDelta,
    region.longitude + region.longitudeDelta,
    region.latitude + region.latitudeDelta,
  ];

  export const getBoundsZoomLevel = (bounds, dimensions) => geoViewport.viewport(bounds, dimensions, 0, 20).zoom;

  export const shoudDoClustering = (region, { latitudeDelta, longitudeDelta, latitude, longitude}) => 
    (Math.abs(region.latitudeDelta - latitudeDelta) > latitudeDelta / 15 ||
    Math.abs(region.longitude - longitude) >= longitudeDelta / 10 ||
    Math.abs(region.latitude - latitude) >= latitudeDelta / 10);
