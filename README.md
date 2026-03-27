# Drones Over Ghent

Autonomous drone flocking simulation over a 3D model of Ghent, using real city data and boid algorithms with cinematic camera modes.

**Live Demo:** https://flyover.mateovandamme.com/

## Why

In 2024, the city of Ghent began piloting police drones for crowd surveillance during events and protests. The same open 3D data that makes thise art projects possible — centimeter-accurate rooftops, extruded walls, terrain elevation — is the kind of infrastructure that enables autonomous navigation and tracking from above.

These projects reclaim that perspective. Instead of surveilling, the drones flock like starlings. Instead of tracking, you fly freely. The city becomes a canvas rather than a control grid — same data, opposite intent.

## Features

- **Boid Flocking System**: Autonomous flying drones using boid algorithms (separation, alignment, cohesion)
- **Cinematic Camera Modes**: Follow, chase, orbit, and manual control modes
- **Real 3D City Models**: Official city data from Ghent
- **Interactive Controls**: Adjust boid behavior in real-time with GUI

## Controls

### Camera Modes
- **1** - Follow mode (camera behind and above boid)
- **2** - Chase mode (close pursuit camera)
- **3** - Orbit mode (circular around flock)
- **4** - Manual mode (free flight)
- **Tab** - Switch to next boid
- **D** - Toggle debug info (GUI + stats)

### Manual Mode Controls
- **Click** to capture mouse
- **Mouse** to look around
- **WASD** to move
- **Space** to fly up
- **Shift** to fly down
- **ESC** to release mouse

## Data

3D city tiles are loaded from Google Cloud Storage at runtime. The data pipeline for converting DWG source files to STL is in the parent project: [fly-over-gent](https://github.com/MateoVanDamme/fly-over-gent).

### Data Source & License

This project uses 3D city data from the City of Ghent, made available under the **Modellicentie Gratis Hergebruik Vlaanderen v1.0** (Free Reuse Model License Flanders v1.0).

**Dataset:** https://data.stad.gent/explore/dataset/gent-in-3d/table/

Contains government information obtained under the free reuse model license Flanders v1.0.

## Tech Stack

- Three.js for 3D rendering
- STL file format for city geometry
- Vanilla JavaScript (no framework)
