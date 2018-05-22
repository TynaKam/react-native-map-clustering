import React, { Component } from 'react';
import PropTypes from 'prop-types';
import MapView from 'react-native-maps';
import { width as w, height as h } from 'react-native-dimension';
import SuperCluster from 'supercluster';
import CustomMarker from './CustomMarker';
import { dissoc } from 'ramda';
import { getBounds, getBoundsZoomLevel, shoudDoClustering } from './clusteringUtils';
const removeChildrenFromProps = dissoc('children');

const MAX_ZOOM = 20;
const MIN_ZOOM = 1;

export default class MapWithClustering extends Component {
  state = {
    currentRegion: this.props.region,
    clusterStyle: {
      borderRadius: w(10),
      backgroundColor: this.props.clusterColor,
      borderColor: this.props.clusterBorderColor,
      borderWidth: this.props.clusterBorderWidth,
      width: w(10),
      height: w(10),
      justifyContent: 'center',
      alignItems: 'center',
    },
    clusterTextStyle: {
      fontSize: this.props.clusterTextSize,
      color: this.props.clusterTextColor,
      fontWeight: 'bold',
    },
  };

  componentDidMount() {
    this.createMarkersOnMap();
  }

  componentWillReceiveProps() {
    this.createMarkersOnMap();
  }

  componentWillReceiveProps({ region }) {
    if (region !== this.state.region) {
      this.setState({ currentRegion: region });
    }
  }

  onRegionChangeComplete = (region) => {
    if (region.longitudeDelta <= 80 && shoudDoClustering(region, this.state.currentRegion)) {
        shoudDoClustering(region, this.state.currentRegion)
        this.calculateClustersForMap(region);
      }
    }
  };

  createMarkersOnMap = () => {
    const markers = [];
    const otherChildren = [];

    React.Children.forEach(this.props.children, (marker) => {
      if (marker.props && marker.props.coordinate) {
        markers.push({
          marker,
          properties: { point_count: 0 },
          geometry: {
            type: 'Point',
            coordinates: [marker.props.coordinate.longitude, marker.props.coordinate.latitude],
          },
        });
      } else {
        otherChildren.push(marker);
      }
    });

    if (!this.superCluster) {
      this.superCluster = SuperCluster({
        radius: this.props.radius,
        maxZoom: MAX_ZOOM,
        minZoom: MIN_ZOOM,
      });
    }
    this.superCluster.load(markers);

    this.setState(
      {
        markers,
        otherChildren,
      },
      () => {
        this.calculateClustersForMap();
      },
    );
  };

  calculateClustersForMap = async (currentRegion = this.state.currentRegion) => {
    let clusteredMarkers = [];

    if (this.props.clustering && this.superCluster) {
      const bBox = getBounds(this.state.currentRegion);
      const zoom = this.getBoundsZoomLevel(bBox, [h(50), w(50)]);
      const clusters = await this.superCluster.getClusters(
        [bBox[0], bBox[1], bBox[2], bBox[3]],
        zoom,
      );
      clusteredMarkers = clusters.map(cluster => (
        <CustomMarker
          pointCount={cluster.properties.point_count}
          clusterId={cluster.properties.cluster_id}
          geometry={cluster.geometry}
          clusterStyle={this.state.clusterStyle}
          clusterTextStyle={this.state.clusterTextStyle}
          marker={cluster.properties.point_count === 0 ? cluster.marker : null}
          key={
            JSON.stringify(cluster.geometry) +
            cluster.properties.cluster_id +
            cluster.properties.point_count
          }
          onClusterPress={this.props.onClusterPress}
        />
      ));
    } else {
      clusteredMarkers = this.state.markers.map(cluster => cluster.marker);
    }

    this.setState({
      clusteredMarkers,
      currentRegion,
    });
  };

  render() {
    return (
      <MapView
        {...removeChildrenFromProps(this.props)}
        ref={(ref) => {
          this.root = ref;
        }}
        region={this.state.currentRegion}
        onRegionChangeComplete={this.onRegionChangeComplete}
      >
        {this.state.clusteredMarkers}
        {this.state.otherChildren}
      </MapView>
    );
  }
}

MapWithClustering.propTypes = {
  region: PropTypes.object,
  clustering: PropTypes.bool,
  radius: PropTypes.number,
  clusterColor: PropTypes.string,
  clusterTextColor: PropTypes.string,
  clusterBorderColor: PropTypes.string,
  clusterBorderWidth: PropTypes.number,
  clusterTextSize: PropTypes.number,
  onClusterPress: PropTypes.func,
};

const totalSize = num => Math.sqrt(h(50) * h(50) + w(50) * w(50)) * num / 50;

MapWithClustering.defaultProps = {
  clustering: true,
  radius: w(3),
  clusterColor: '#F5F5F5',
  clusterTextColor: '#FF5252',
  clusterBorderColor: '#FF5252',
  clusterBorderWidth: 1,
  clusterTextSize: totalSize(1.8),
  onClusterPress: () => {},
};
