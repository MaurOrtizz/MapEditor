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
import * as turf from '@turf/turf';

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
  const [editMode, setEditMode] = useState<'vertices' | 'draw' | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<number[][]>([]);
const [draggingVertex, setDraggingVertex] = useState<{ 
  index: number; 
  polygonIndex: number; 
  ringIndex: number;
  vertexIndex: number;
  isDrawingPoint: boolean;
} | null>(null);

  const handleSetEditMode = useCallback((mode: 'vertices' | 'draw' | null) => {
    setEditMode(mode);
    if (mode !== 'draw') {
      setDrawingPoints([]);
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoveredCountry(null);
  }, []);

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    if (editMode === 'draw') {
      const { lngLat } = e;
      setDrawingPoints(prev => [...prev, [lngLat.lng, lngLat.lat]]);
      return;
    }

    const feature = e.features?.[0];
    if (feature) {
      const name = feature.properties?.name;
      setSelectedCountry(name);
      setCountryEdits(prev => {
        if (prev[name]) return prev;
        return {
          ...prev,
          [name]: { name, color: '#dcdcdc' }
        };
      });
    } else {
      setSelectedCountry(null);
      setEditingCountry(null);
      setEditMode(null);
    }
  }, [editMode]);

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
      const savedGeometry = countryEdits[name]?.geometry;
      const originalFeature = countriesData.features.find((f: any) => f.properties?.name === name);
      setEditedGeometries(prev => ({
        ...prev,
        [name]: savedGeometry ?? originalFeature?.geometry
      }));
    }
  }, [countryEdits]);


  const handlePanelChange = useCallback((data: CountryData) => {
    if (!selectedCountry) return;
    setCountryEdits(prev => ({ ...prev, [selectedCountry]: data }));
  }, [selectedCountry]);

  const handleSave = useCallback(async () => {
    const editsToSave = Object.fromEntries(
      Object.entries(countryEdits).map(([name, data]) => [
        name,
        { ...data, geometry: data.geometry ?? null }
      ])
    );
    
    if (currentWorldId) {
      await api.updateWorld(currentWorldId, {
        name: currentWorldName!,
        edits: editsToSave
      });
      alert('World saved!');
    } else {
      const name = prompt('Name your world:');
      if (!name) return;
      const created = await api.createWorld({ name, edits: editsToSave });
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

    let geometry = editedGeometries[editingCountry];

    if (drawingPoints.length >= 3) {
      const originalFeature = countriesData.features.find(
        (f: any) => f.properties?.name === editingCountry
      );
      const baseGeometry = geometry 
        ?? countryEdits[editingCountry]?.geometry 
        ?? originalFeature.geometry;

      const drawnPolygon = turf.polygon([[...drawingPoints, drawingPoints[0]]]);
      const basePolygon = turf.feature(baseGeometry);
      const unioned = turf.union(turf.featureCollection([basePolygon as any, drawnPolygon]));
      if (unioned) geometry = unioned.geometry;
    }

    if (geometry) {
      const newGeometry = turf.feature(geometry);

      if (!allowOverlapping) {
        const updatedEdits = { ...countryEdits };

        countriesData.features.forEach((feature: any) => {
          const name = feature.properties?.name;
          if (name === editingCountry) return;

          const otherGeometry = countryEdits[name]?.geometry || feature.geometry;
          if (!otherGeometry) return;
          if (countryEdits[name]?.geometry === null) return;
          const otherFeature = turf.feature(otherGeometry);

          try {
            const intersection = turf.intersect(turf.featureCollection([newGeometry as any, otherFeature as any]));
            if (!intersection) return;

            const difference = turf.difference(turf.featureCollection([otherFeature as any, newGeometry as any]));

            if (!difference) {
              updatedEdits[name] = {
                ...updatedEdits[name] ?? { name, color: '#dcdcdc' },
                geometry: null
              };
            } else {
              updatedEdits[name] = {
                ...updatedEdits[name] ?? { name, color: '#dcdcdc' },
                geometry: difference.geometry
              };
            }
          } catch {
            return;
          }
        });

        updatedEdits[editingCountry] = {
          ...countryEdits[editingCountry] ?? { name: editingCountry, color: '#dcdcdc' },
          geometry
        };

        setCountryEdits(updatedEdits);
      } else {
        setCountryEdits(prev => ({
          ...prev,
          [editingCountry]: {
            ...prev[editingCountry],
            geometry
          }
        }));
      }
    }

    setEditingCountry(null);
    setEditMode(null);
    setDrawingPoints([]);
  }, [editingCountry, editedGeometries, drawingPoints, countryEdits, allowOverlapping]);
    
  const modifiedGeoJSON = {
    ...countriesData,
    features: countriesData.features
      .filter((feature: any) => {
        const name = feature.properties?.name;
        const edit = countryEdits[name];
        if (!edit) return true;
        return edit.geometry !== null;
      })
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

  const { editingVertices } = (() => {
    if (!editingCountry) return { editingVertices: null };

    const feature = editedGeometries[editingCountry] 
      ? { geometry: editedGeometries[editingCountry] }
      : countriesData.features.find((f: any) => f.properties?.name === editingCountry);
    
    if (!feature) return { editingVertices: null };

    const allCoords: { coord: number[]; polygonIndex: number; ringIndex: number; vertexIndex: number }[] = [];

    if (editMode === 'vertices') {
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
    }

    const editingVertices = allCoords.length > 0 || drawingPoints.length > 0 ? {
      type: 'FeatureCollection' as const,
      features: [
        ...allCoords.map((item, index) => ({
          type: 'Feature' as const,
          properties: {
            index,
            polygonIndex: item.polygonIndex,
            ringIndex: item.ringIndex,
            vertexIndex: item.vertexIndex,
            isDrawingPoint: false
          },
          geometry: {
            type: 'Point' as const,
            coordinates: item.coord
          }
        })),
        ...drawingPoints.map((coord, index) => ({
          type: 'Feature' as const,
          properties: {
            index: allCoords.length + index,
            polygonIndex: -1,
            ringIndex: -1,
            vertexIndex: index,
            isDrawingPoint: true
          },
          geometry: {
            type: 'Point' as const,
            coordinates: coord
          }
        }))
      ]
    } : null;
    return { editingVertices };
  })();

  const onVertexMouseDown = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;
    e.preventDefault();
    setDraggingVertex({
      index: feature.properties?.index,
      polygonIndex: feature.properties?.polygonIndex,
      ringIndex: feature.properties?.ringIndex,
      vertexIndex: feature.properties?.vertexIndex,
      isDrawingPoint: feature.properties?.isDrawingPoint
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

    if (draggingVertex.isDrawingPoint) {
      setDrawingPoints(prev => {
        const updated = [...prev];
        updated[draggingVertex.vertexIndex] = newCoord;
        return updated;
      });
      return;
    }

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
                geometry: (() => {
                  const base = editedGeometries[editingCountry] ?? 
                    countriesData.features.find((f: any) => f.properties?.name === editingCountry)?.geometry;
                  
                  if (drawingPoints.length >= 3) {
                    try {
                      const drawnPolygon = turf.polygon([[...drawingPoints, drawingPoints[0]]]);
                      const basePolygon = turf.feature(base);
                      const unioned = turf.union(turf.featureCollection([basePolygon as any, drawnPolygon]));
                      if (unioned) return unioned.geometry;
                    } catch {
                      return base;
                    }
                  }
                  return base;
                })()
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
            setEditMode(null);
          }}
          editingCountry={editingCountry}
          editMode={editMode}
          onEnterEditMode={() => {
            setEditingCountry(selectedCountry);
            const savedGeometry = countryEdits[selectedCountry]?.geometry;
            const originalFeature = countriesData.features.find(
              (f: any) => f.properties?.name === selectedCountry
            );
            setEditedGeometries(prev => ({
              ...prev,
              [selectedCountry!]: savedGeometry ?? originalFeature?.geometry
            }));
          }}
          onSetEditMode={handleSetEditMode}
          onDoneEditing={handleDoneEditing}
        />
      )}
    </div>
  );
}

export default App;