declare module '*.geojson' {
  const value: any
  export default value
}

declare module '*.geojson?raw' {
  const value: string
  export default value
}
