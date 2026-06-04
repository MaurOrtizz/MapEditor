import { useState, useCallback } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import countriesRaw from './data/countries_mid_res.geojson?raw';
import BlankWorldMap from './data/BlankWorldMap.json'
import { api, type WorldData } from './api';
import Navbar from './components/Navbar';
import CountryPanel from './components/CountryPanel';
import WorldsPanel from './components/WorldsPanel';

interface CountryData {
  name: string;
  color: string;
}

const countriesData = JSON.parse(countriesRaw);

function App() {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryEdits, setCountryEdits] = useState<Record<string, CountryData>>({});
  const [showWorldsPanel, setShowWorldsPanel] = useState(false);
  const [currentWorldId, setCurrentWorldId] = useState<number | null>(null);
  const [currentWorldName, setCurrentWorldName] = useState<string | null>(null);

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    setHoveredCountry(feature ? feature.properties?.name : null);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoveredCountry(null);
  }, []);

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature) {
      const name = feature.properties?.name;
      setSelectedCountry(name);
      setCountryEdits(prev => ({
        ...prev,
        [name]: prev[name] ?? { name, color: '#dcdcdc' }
      }));
    } else {
      setSelectedCountry(null);
    }
  }, []);


  const handlePanelChange = useCallback((data: CountryData) => {
    if (!selectedCountry) return;
    setCountryEdits(prev => ({ ...prev, [selectedCountry]: data }));
  }, [selectedCountry]);

  const handleSave = useCallback(async () => {
    if (currentWorldId) {
      await api.updateWorld(currentWorldId, {
        name: currentWorldName!,
        edits: countryEdits
      });
      alert('World saved!');
    } else {
      const name = prompt('Name your world:');
      if (!name) return;
      const created = await api.createWorld({ name, edits: countryEdits });
      setCurrentWorldId(created.id!);
      setCurrentWorldName(created.name);
      alert('World saved!');
    }
  }, [currentWorldId, currentWorldName, countryEdits]);

  const handleLoad = useCallback((world: WorldData) => {
    setCountryEdits(world.edits);
    setCurrentWorldId(world.id!);
    setCurrentWorldName(world.name);
    setShowWorldsPanel(false);
    setSelectedCountry(null);
  }, []);
    
  const modifiedGeoJSON = {
    ...countriesData,
    features: countriesData.features.map((feature: any) => {
      const name = feature.properties?.name;
      const edit = countryEdits[name];
      return {
        ...feature,
        properties: {
          ...feature.properties,
          customColor: edit?.color ?? '#dcdcdc'
        }
      };
    })
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Navbar
        onSave={handleSave}
        onMyWorlds={() => {
          setShowWorldsPanel(prev => !prev);
          setSelectedCountry(null);
        }}
      />
      <Map
        initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={BlankWorldMap}
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
                ['==', ['get', 'name'], selectedCountry], '#613e00',
                ['==', ['get', 'name'], hoveredCountry], '#031a34',
                ['get', 'customColor']
              ],
              'fill-opacity': 0.5
            }}
          />
          <Layer
            id="countries-border"
            type="line"
            paint={{
              'line-color': '#1a1a2e',
              'line-width': 1
            }}
          />
        </Source>
      </Map>

      {showWorldsPanel && (
        <WorldsPanel
          onLoad={handleLoad}
          onClose={() => setShowWorldsPanel(false)}
        />
      )}

      {!showWorldsPanel && selectedCountry && countryEdits[selectedCountry] && (
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