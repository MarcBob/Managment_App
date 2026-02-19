# Project Memories - Org Planner

## Core Principles
- **TDD First:** Always write a failing test before implementing a feature.
- **Visual Clarity:** The org chart must clearly distinguish between filled and empty positions.
- **Team Clustering:** Teams must have a visual frame to show belonging.

## Data Schema
- CSV based on BambooHR export.
- Supervisor link uses `LastName, FirstName` matching.
- Includes `Start Date` and `Exit Date` for hiring and exit planning.

## Tools
- React Flow for graph visualization.
- Papa Parse for CSV processing.
