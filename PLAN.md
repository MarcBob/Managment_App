# Engineering Organization Planner - Development Plan

## Goal
Build a web application to plan and visualize an engineering organization. The app will support importing CSV data, interactive org charts, team clustering, and organizational restructuring (moving people, adding positions).

## Status
- [x] Phase 1: Foundation & Data Import
- [x] Phase 2: Org Chart Visualization
- [x] Phase 3: Interactivity & Planning Features
- [x] Phase 4: Refinement & Export
- [x] Phase 5: Persistence & Multi-Plan Management
    - [x] Multiple plan storage on backend.
    - [x] Editable plan title in UI (Google Docs style).
    - [x] Plan switcher/manager UI.

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
      - **Recruiter Mode:** Refined to automatically hide all nodes that are not vacancies and do not lead to any vacancies, providing a focused view of the hiring pipeline.
      - Integrated into both `EditNodeModal` and `csvParser`.
   6. **UI Refinements:**
      - **Multi-line Job Titles:** Job titles now reserve three lines on the node card, allowing longer titles to wrap without being truncated immediately.
      - **Interactive Cards:** Removed the explicit edit button; clicking anywhere on a node card now opens the edit modal, with hover and active states for better feedback.
      - **Team Label Layering:** Ensured team group labels and borders are rendered above connection arrows (edges) for better readability by adjusting the z-index and node rendering order.
   ## Next Steps (Future Enhancements)
- [x] Leadership Layers: Define layers based on job title identifiers to align nodes at the same height.
- [x] Visual Team Clustering: Draw frames around direct reports in the same team.
- [x] Custom Node Filters: Define color filters for nodes based on job title keywords, with priority-based ordering.
- [x] Filter Groups: Save sets of filters as higher-level groups that can be toggled on/off collectively.
- Detailed person info in a side panel.
