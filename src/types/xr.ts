export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  storagePath: string;
  thumbnailPath?: string;
  category?: string;
  tags?: string[];
  createdAt: string;
}

export interface InteractionAction {
  type: 'play_sound' | 'show_text' | 'change_color' | 'play_animation';
  value: string;
}

export interface InteractionLogic {
  id: string;
  modelId: string;
  trigger: 'tap' | 'hover' | 'proximity' | 'animation_end';
  actions: InteractionAction[];
}

export interface SceneConfig {
  id: string;
  name: string;
  preset?: string;
  backgroundPath?: string;
  lighting: {
    intensity: number;
    ambientColor: string;
  };
}
