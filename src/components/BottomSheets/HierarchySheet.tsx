import React from 'react';
import { Entity, EntityGroup, GameProject } from '../../types/engine';
import { LayerOrderingSheet } from './LayerOrderingSheet';

interface HierarchySheetProps {
  entities: Entity[];
  groups?: EntityGroup[];
  selectedEntityId: string | null;
  selectedEntityIds?: string[];
  project?: GameProject;
  onSelectEntity: (id: string, isMultiToggle?: boolean) => void;
  onSelectAllEntities?: () => void;
  onClearSelection?: () => void;
  onUpdateEntity: (entity: Entity) => void;
  onUpdateEntities?: (entities: Entity[]) => void;
  onUpdateGroups?: (groups: EntityGroup[]) => void;
  onUpdateProject?: (project: GameProject) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicateEntity: (id: string) => void;
  onDeleteEntity: (id: string) => void;
  onOpenSavePrefab?: () => void;
  onClose: () => void;
}

export const HierarchySheet: React.FC<HierarchySheetProps> = (props) => {
  return <LayerOrderingSheet {...props} />;
};
