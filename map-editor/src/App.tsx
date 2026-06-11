import { useState, useCallback } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import countriesRaw from './data/countries_mid_res.geojson?raw';
import BlankWorldMapJson from './data/BlankWorldMap.json'
import type { StyleSpecification } from 'maplibre-gl';
import { api, type WorldData } from './api';
import Navbar from './components/Navbar';
import CountryPanel from './components/CountryPanel';
import WorldsPanel from './components/WorldsPanel';

interface CountryData {
  name: string;
  color: string;
  geometry?: any;
}

const BlankWorldMap = BlankWorldMapJson as unknown as StyleSpecification;
const countriesData = JSON.parse(countriesRaw);

function App() {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryEdits, setCountryEdits] = useState<Record<string, CountryData>>({});
  const [showWorldsPanel, setShowWorldsPanel] = useState(false);
  const [currentWorldId, setCurrentWorldId] = useState<number | null>(null);
  const [currentWorldName, setCurrentWorldName] = useState<string | null>(null);
  const [editingCountry, setEditingCountry] = useState<string | null>(null);
  const [allowOverlapping, setAllowOverlapping] = useState(false);
  const [editedGeometries, setEditedGeometries] = useState<Record<string, any>>({});
const [draggingVertex, setDraggingVertex] = useState<{ 
  index: number; 
  polygonIndex: number; 
  ringIndex: number;
  vertexIndex: number;
} | null>(null);

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
      setEditingCountry(null);
    }
  }, []);

  const onDblClick = useCallback((e: MapLayerMouseEvent) => {
    e.preventDefault();
    const feature = e.features?.[0];
    if (feature) {
      const name = feature.properties?.name;
      setEditingCountry(name);
      setSelectedCountry(name);
      setCountryEdits(prev => ({
        ...prev,
        [name]: prev[name] ?? { name, color: '#dcdcdc' }
      }));
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

    const geometries: Record<string, any> = {};
    Object.entries(world.edits).forEach(([name, data]) => {
      if (data.geometry) {
        geometries[name] = data.geometry;
      }
    });
    setEditedGeometries(geometries);
  }, []);

  const handleDoneEditing = useCallback(() => {
    if (!editingCountry) return;
    const geometry = editedGeometries[editingCountry];
    if (geometry) {
      setCountryEdits(prev => ({
        ...prev,
        [editingCountry]: {
          ...prev[editingCountry],
          geometry
        }
      }));
    }
    setEditingCountry(null);
  }, [editingCountry, editedGeometries]);
    
  const modifiedGeoJSON = {
    ...countriesData,
    features: countriesData.features
      .filter((feature: any) => feature.properties?.name !== editingCountry)
      .map((feature: any) => {
        const name = feature.properties?.name;
        const edit = countryEdits[name];
        return {
          ...feature,
          geometry: edit?.geometry ?? feature.geometry,
          properties: {
            ...feature.properties,
            customColor: edit?.color ?? '#dcdcdc'
          }
        };
      })
  };

  const editingVertices = (() => {
    if (!editingCountry) return null;
    
    const feature = editedGeometries[editingCountry] 
      ? { geometry: editedGeometries[editingCountry] }
      : countriesData.features.find((f: any) => f.properties?.name === editingCountry);
    
    if (!feature) return null;

    const allCoords: { coord: number[]; polygonIndex: number; ringIndex: number; vertexIndex: number }[] = [];

    if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates.forEach((ring: number[][], ringIndex: number) => {
        ring.forEach((coord: number[], vertexIndex: number) => {
          allCoords.push({ coord, polygonIndex: 0, ringIndex, vertexIndex });
        });
      });
    } else if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach((polygon: number[][][], polygonIndex: number) => {
        polygon.forEach((ring: number[][], ringIndex: number) => {
          ring.forEach((coord: number[], vertexIndex: number) => {
            allCoords.push({ coord, polygonIndex, ringIndex, vertexIndex });
          });
        });
      });
    }

    return {
      type: 'FeatureCollection' as const,
      features: allCoords.map((item, index) => ({
        type: 'Feature' as const,
        properties: {
          index,
          polygonIndex: item.polygonIndex,
          ringIndex: item.ringIndex,
          vertexIndex: item.vertexIndex
        },
        geometry: { 
          type: 'Point' as const, 
          coordinates: item.coord 
        }
      }))
    };
  })();

  const onVertexMouseDown = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;
    e.preventDefault();
    setDraggingVertex({
      index: feature.properties?.index,
      polygonIndex: feature.properties?.polygonIndex,
      ringIndex: feature.properties?.ringIndex,
      vertexIndex: feature.properties?.vertexIndex
    });
  }, []);

  const onMouseMoveWithDrag = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!draggingVertex || !editingCountry) {
      setHoveredCountry(feature ? feature.properties?.name : null);
      return;
    }

    const { lngLat } = e;
    const newCoord = [lngLat.lng, lngLat.lat];

    setEditedGeometries(prev => {
      const originalFeature = countriesData.features.find(
        (f: any) => f.properties?.name === editingCountry
      );
      const base = prev[editingCountry] ?? originalFeature.geometry;
      const geometry = JSON.parse(JSON.stringify(base));

      if (geometry.type === 'Polygon') {
        const ring = geometry.coordinates[draggingVertex.ringIndex];
        ring[draggingVertex.vertexIndex] = newCoord;
        if (draggingVertex.vertexIndex === 0) {
          ring[ring.length - 1] = newCoord;
        } else if (draggingVertex.vertexIndex === ring.length - 1) {
          ring[0] = newCoord;
        }
      } else if (geometry.type === 'MultiPolygon') {
        const ring = geometry.coordinates[draggingVertex.polygonIndex][draggingVertex.ringIndex];
        ring[draggingVertex.vertexIndex] = newCoord;
        if (draggingVertex.vertexIndex === 0) {
          ring[ring.length - 1] = newCoord;
        } else if (draggingVertex.vertexIndex === ring.length - 1) {
          ring[0] = newCoord;
        }
      }

      return { ...prev, [editingCountry]: geometry };
    });
  }, [draggingVertex, editingCountry]);

  const onMouseUp = useCallback(() => {
    setDraggingVertex(null);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Navbar
        onSave={handleSave}
        onMyWorlds={() => {
          setShowWorldsPanel(prev => !prev);
          setSelectedCountry(null);
        }}
        allowOverlapping={allowOverlapping}
        onToggleOverlapping={() => setAllowOverlapping(prev => !prev)}
      />
      <Map
        initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={BlankWorldMap}
        interactiveLayerIds={['countries-fill', 'vertices-layer']}
        onMouseMove={onMouseMoveWithDrag}
        onMouseLeave={onMouseLeave}
        onDblClick={onDblClick}
        doubleClickZoom={false}
        onClick={onClick}
        onMouseUp={onMouseUp}
        onMouseDown={(e) => {
          if (e.features?.[0]?.layer?.id === 'vertices-layer') {
            onVertexMouseDown(e);
          }
        }}
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
        {editingVertices && (
          <Source id="vertices" type="geojson" data={editingVertices}>
            <Layer
              id="vertices-layer"
              type="circle"
              paint={{
                'circle-radius': 5,
                'circle-color': '#ffffff',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#4f46e5'
              }}
            />
          </Source>
        )}
        {editingCountry && (
          <Source
            id="editing-country"
            type="geojson"
            data={{
              type: 'FeatureCollection' as const,
              features: [{
                type: 'Feature' as const,
                properties: { 
                  name: editingCountry,
                  customColor: countryEdits[editingCountry]?.color ?? '#dcdcdc'
                },
                geometry: editedGeometries[editingCountry] ?? 
                  countriesData.features.find((f: any) => f.properties?.name === editingCountry)?.geometry
              }]
            }}
          >
            <Layer
              id="editing-country-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'customColor'],
                'fill-opacity': 0.5
              }}
            />
            <Layer
              id="editing-country-border"
              type="line"
              paint={{
                'line-color': '#4f46e5',
                'line-width': 2
              }}
            />
          </Source>
        )}
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
          onClose={() => {
            setSelectedCountry(null);
            setEditingCountry(null);
          }}
          isEditing={editingCountry === selectedCountry}
          onEditBorders={() => setEditingCountry(selectedCountry)}
          onDoneEditing={handleDoneEditing}
        />
      )}
    </div>
  );
}

export default App;