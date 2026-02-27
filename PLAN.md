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
      - **Recruiter Mode:** Refined to automatically hide all nodes that are not vacancies and do not lead to any vacancies, providing a focused view of the hiring pipeline. Now shows team indicators (dashed frames) for all vacancies that are part of a larger team, even if only one vacancy is visible in the current view.
      - Integrated into both `EditNodeModal` and `csvParser`.
   6. **UI Refinements:**
      - **Multi-line Job Titles:** Job titles now reserve three lines on the node card, allowing longer titles to wrap without being truncated immediately.
      - **Interactive Cards:** Removed the explicit edit button; clicking anywhere on a node card now opens the edit modal, with hover and active states for better feedback.
      - **Team Label Layering:** Ensured team group labels and borders are rendered above connection arrows (edges) for better readability by adjusting the z-index and node rendering order.
      - **Dynamic Contrast Color:** Automatically switches text and icon colors to white on dark custom background colors to ensure optimal accessibility and readability.
      - **Settings Modal Reorder:** Reordered the settings sections for better user experience, moving "Keyboard Shortcuts" and "Company & Outlook" settings to the bottom of the list.
   7. **Keyboard Shortcuts:**
      - Added configurable keyboard shortcuts for common actions.
      - Default search focus shortcut: `meta+e` (Command+E on Mac).
      - **Teams Shortcut:** Added a configurable shortcut (`meta+m` default) to open MS Teams chat for a selected node, a node being edited, or a unique search result.
      - Configurable via the Chart Settings modal.
   8. **Collaboration Integration:**
      - **MS Teams Chat:** Replaced the primary email button with a message button that opens a MS Teams chat deep link.
      - **Multi-Recipient Support:** Added options to start group chats with direct reports or the full sub-organization.
      - **Unified Action Menu:** Consolidated both MS Teams and Outlook email options into a single, accessible dropdown menu in the position edit modal.
      - **Click-to-Close Modal:** Enhanced the `EditNodeModal` to close when clicking outside the modal content, improving user experience and consistency.
   9. **Proximity Zoom (Magnifying Glass):**
      - Added a "magnifying glass" effect that enlarges nodes near the mouse cursor when the Space bar is held down.
      - Uses a React Context to efficiently track mouse position and space bar state across all nodes.
      - Dynamically calculates scale and z-index for person nodes based on distance to the cursor.
   10. **Plan & Settings Persistence:**
       - All chart settings (leadership layers, color filters, shortcuts, etc.) are now saved within the individual organization plan JSON file on the server.
   11. **Organization Statistics:**
       - Added a statistics modal that displays key metrics: total positions, organizational depth, and minimum/maximum leadership span.
       - Dynamic counts for all active color filters (including those in filter groups).
       - Accessible by clicking the "Positions" label in the top-right corner.
   12. **Reordering & Priority:**
       - Added drag-and-drop reordering for Filter Groups and Leadership Layers in the Chart Settings modal.
       - Allows users to easily adjust the priority of color filter sets and the vertical alignment hierarchy of the organization chart.
   13. **UI Cleanup:**
       - Consolidated the two top bars into a single, clean header.
       - Moved the "Recruiter Mode" toggle and "Positions" count to the main header.
       - Removed the redundant "Organization Chart" title and "Reset View" button to maximize vertical space for the org chart.
   ## Next Steps (Future Enhancements)
- [x] Leadership Layers: Define layers based on job title identifiers to align nodes at the same height. Now supports reordering.
- [x] Visual Team Clustering: Draw frames around direct reports in the same team. The frame also includes the team lead if they share the same team property.
- [x] Custom Node Filters: Define color filters for nodes based on job title keywords, with priority-based ordering.
- [x] Filter Groups: Save sets of filters as higher-level groups that can be toggled on/off collectively. Now supports reordering.
- Detailed person info in a side panel.
