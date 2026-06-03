import { useState, useCallback } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import countriesRaw from './data/countries.geojson?raw';
import CountryPanel from './components/CountryPanel';

interface CountryData {
  name: string;
  color: string;
}

const countriesData = JSON.parse(countriesRaw);

function App() {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryEdits, setCountryEdits] = useState<Record<string, CountryData>>({});

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    setHoveredCountry(feature ? feature.properties?.NAME : null);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoveredCountry(null);
  }, []);

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature) {
      const name = feature.properties?.NAME;
      setSelectedCountry(name);
      setCountryEdits(prev => ({
        ...prev,
        [name]: prev[name] ?? { name, color: '#627BC1' }
      }));
    } else {
      setSelectedCountry(null); // click en océano = deseleccionar
    }
  }, []);


  const handlePanelChange = useCallback((data: CountryData) => {
    if (!selectedCountry) return;
    setCountryEdits(prev => ({ ...prev, [selectedCountry]: data }));
  }, [selectedCountry]);

  const fillColorExpression: any = [
    'case',
    ['==', ['get', 'NAME'], selectedCountry], '#F59E0B',
    ['==', ['get', 'NAME'], hoveredCountry], '#93C5FD',
    '#627BC1'
  ];

  const modifiedGeoJSON = {
    ...countriesData,
    features: countriesData.features.map((feature: any) => {
      const name = feature.properties?.NAME;
      const edit = countryEdits[name];
      return {
        ...feature,
        properties: {
          ...feature.properties,
          customColor: edit?.color ?? '#627BC1'
        }
      };
    })
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Map
        initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactiveLayerIds={['countries-fill']}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <Source id="countries" type="geojson" data={modifiedGeoJSON}>
          <Layer
            id="countries-fill"
            type="fill"
            paint={{
              'fill-color': [
                'case',
                ['==', ['get', 'NAME'], selectedCountry], '#F59E0B',
                ['==', ['get', 'NAME'], hoveredCountry], '#93C5FD',
                ['get', 'customColor']
              ],
              'fill-opacity': 0.6
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

      {selectedCountry && countryEdits[selectedCountry] && (
        <CountryPanel
          countryName={selectedCountry}
          data={countryEdits[selectedCountry]}
          onChange={handlePanelChange}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  );
}

export default App;