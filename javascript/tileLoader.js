import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

// Data source configuration
export const USE_ONLINE_DATA = true; // true = online storage, false = local data folder
export const ONLINE_DATA_BASE = 'https://storage.googleapis.com/fly-over-ghent/';

// Shared materials for better performance (reused across all tiles)
const buildingMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    flatShading: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true
});

// Terrain material - Lambert with height-based color modification
const terrainMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    flatShading: false,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true
});

// Inject height cutoff into Lambert shader
terrainMaterial.onBeforeCompile = (shader) => {
    // Add uniform for cutoff height
    shader.uniforms.cutoffHeight = { value: 6.5 };
    shader.uniforms.lowColor = { value: new THREE.Color(0xcc0000) };
    shader.uniforms.highColor = { value: new THREE.Color(0xffffff) };

    // Add varying to pass height from vertex to fragment shader
    shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying float vHeight;`
    );

    shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vHeight = position.z;`
    );

    // Modify fragment shader to use height-based color
    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        uniform float cutoffHeight;
        uniform vec3 lowColor;
        uniform vec3 highColor;
        varying float vHeight;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec3 heightColor = vHeight < cutoffHeight ? lowColor : highColor;
        vec4 diffuseColor = vec4( heightColor, opacity );`
    );
};

/**
 * Parses Lambert-72 coordinates from a filename
 * Format: Geb_105000_192000_10_2_N_2013.stl
 * Extracts X (105000) and Y (192000) coordinates
 */
function parseLambert72Filename(filename) {
    const parts = filename.split('/').pop().replace('.stl', '').split('_');
    return {
        x: parseInt(parts[1]),
        y: parseInt(parts[2]),
        filename: filename
    };
}

/**
 * Loads and processes STL tiles for buildings and terrain
 * Tiles are automatically centered around the origin (0, 0, 0)
 * @param {THREE.Scene} scene - The Three.js scene to add meshes to
 * @param {Function} onProgress - Callback for loading progress (loadedCount, totalTiles)
 * @param {Function} onComplete - Callback when all tiles are loaded
 * @param {Function} onError - Callback for errors
 */
export function loadSTLTiles(scene, onProgress, onComplete, onError) {
    // Data path prefix based on configuration
    const dataPath = USE_ONLINE_DATA ? ONLINE_DATA_BASE : 'data/';

    // Building STL files to load
    const buildingFiles = [
        dataPath + 'stl/Geb_104000_193000_10_2_N_2013.stl',
        dataPath + 'stl/Geb_104000_194000_10_2_N_2013.stl',
        dataPath + 'stl/Geb_105000_193000_10_2_N_2013.stl',
        dataPath + 'stl/Geb_105000_194000_10_2_N_2013.stl'
    ];

    const terrainFiles = [
        dataPath + 'stl/Trn_104000_193000_10_0_N_2013.stl',
        dataPath + 'stl/Trn_104000_194000_10_0_N_2013.stl',
        dataPath + 'stl/Trn_105000_193000_10_0_N_2013.stl',
        dataPath + 'stl/Trn_105000_194000_10_0_N_2013.stl'
    ];


    // Parse coordinates from all files
    const allFiles = [...buildingFiles, ...terrainFiles];
    const tiles = allFiles.map(parseLambert72Filename);

    // Find the minimum and maximum coordinates
    const minX = Math.min(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxX = Math.max(...tiles.map(t => t.x));
    const maxY = Math.max(...tiles.map(t => t.y));

    // Calculate center of all tiles for offsetting
    const centerX = (maxX - minX) / 2 + 500;
    const centerY = (maxY - minY) / 2 + 500;

        // Edge file paths for precomputed edges
    const edgeFiles = [
        ...buildingFiles.map(f => f.replace('Geb_', 'Edg_').replace('.stl', '.bin')),
        ...terrainFiles.map(f => f.replace('Trn_', 'TrnEdg_').replace('.stl', '.bin'))
    ];

    const buildingEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
    const terrainEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x999999, linewidth: 1 });

    // Load STL files
    const loader = new STLLoader();
    let loadedCount = 0;
    const totalTiles = tiles.length;

    tiles.forEach((tile, index) => {
        // Determine if this is a terrain or building file
        const isTerrain = tile.filename.includes('Trn_');
        const material = isTerrain ? terrainMaterial : buildingMaterial;

        loader.load(
            tile.filename,
            async (geometry) => {
                // Translate by Lambert-72 coordinates to maintain alignment
                geometry.translate(-tile.x, -tile.y, 0);
                geometry.computeVertexNormals();
                geometry.computeBoundingSphere();

                const group = new THREE.Group();

                // Create mesh
                const mesh = new THREE.Mesh(geometry, material);
                group.add(mesh);

                // Load precomputed edges
                try {
                    const response = await fetch(edgeFiles[index]);
                    if (response.ok) {
                        const buffer = await response.arrayBuffer();
                        const positions = new Float32Array(buffer);
                        const edgeGeometry = new THREE.BufferGeometry();
                        edgeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                        edgeGeometry.translate(-tile.x, -tile.y, 0);
                        group.add(new THREE.LineSegments(edgeGeometry, isTerrain ? terrainEdgeMaterial : buildingEdgeMaterial));
                    }
                } catch (e) {
                    // Edge file missing or failed to load — not critical
                }

                // Calculate relative position from origin based on filename coordinates
                const relativeX = (tile.x - minX);
                const relativeY = (tile.y - minY);

                // Position the tile centered around (0, 0, 0) by subtracting center offset
                group.position.set(relativeX - centerX, 0, -(relativeY - centerY));
                group.rotation.x = -Math.PI / 2;

                scene.add(group);

                loadedCount++;

                if (onProgress) {
                    onProgress(loadedCount, totalTiles, tile.filename);
                }

                if (loadedCount === totalTiles && onComplete) {
                    onComplete();
                }
            },
            undefined,
            (error) => {
                console.error(`Error loading ${tile.filename}:`, error);
                if (onError) {
                    onError(tile.filename, error);
                }
            }
        );
    });
}
