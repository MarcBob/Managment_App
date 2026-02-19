# Engineering Organization Planner - Development Plan

## Goal
Build a web application to plan and visualize an engineering organization. The app will support importing CSV data, interactive org charts, team clustering, and organizational restructuring (moving people, adding positions).

## Status
- [x] Phase 1: Foundation & Data Import
- [x] Phase 2: Org Chart Visualization
- [x] Phase 3: Interactivity & Planning Features
- [x] Phase 4: Refinement & Export

## Tech Stack
- **Frontend:** React (TypeScript)
- **Styling:** Tailwind CSS
- **Diagramming Library:** [React Flow](https://reactflow.dev/)
- **Layout Engine:** [Dagre](https://github.com/dagrejs/dagre)
- **CSV Parsing:** [Papa Parse](https://www.papaparse.com/)
- **Icons:** Lucide React
- **Testing:** Vitest + React Testing Library

## Completed Features
1. **CSV Parser:**
   - Normalizes supervisor names and handles hierarchy mapping.
   - Unit tested with Vitest.
2. **Visual Hierarchy:**
   - Automatic layout using Dagre (Vertical and Horizontal).
   - Custom `PersonNode` with status and team color-coding.
3. **Planning Tools:**
   - **Search:** Filter nodes by name, title, or team.
   - **Restructuring:** Update supervisor by dragging connections between nodes.
   - **Managing Positions:** Add new empty positions under any manager.
   - **Collapse/Expand:** Toggle visibility of sub-hierarchies with counts of hidden reports.
4. **Export:**
       - Export the modified organization back to CSV.
   5. **Hiring & Exit Visibility:**
      - Support for `Start Date` and `Exit Date` fields.
      - Future hires are labeled with a green start date on the org chart.
      - Departing employees are labeled with a red exit date.
      - Integrated into both `EditNodeModal` and `csvParser`.
   ## Next Steps (Future Enhancements)
- Persistence using `localStorage`.
- Real-time team clustering frames (Sub-flows).
- Detailed person info in a side panel.
