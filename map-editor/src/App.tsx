import Map, { Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import countriesRaw from './data/countries.geojson?raw';

const countriesData = JSON.parse(countriesRaw);

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Map
        initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        <Source id="countries" type="geojson" data={countriesData}>
          <Layer
            id="countries-fill"
            type="fill"
            paint={{
              'fill-color': '#627BC1',
              'fill-opacity': 0.4
            }}
          />
          <Layer
            id="countries-border"
            type="line"
            paint={{
              'line-color': '#ffffff',
              'line-width': 1
            }}
          />
        </Source>
      </Map>
    </div>
  );
}

export default App;