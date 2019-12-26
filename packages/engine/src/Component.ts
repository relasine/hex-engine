import Entity from "./Entity";

type Instantiable = { new (...args: Array<any>): any };

export interface ComponentInterface {
  entity: Entity | null;
  isEnabled: boolean;

  _receiveEntity(entity: Entity | null): void;
  onEntityReceived(entity: Entity | null): void;

  enable(): void;
  disable(): void;

  onEnabled(): void;
  onDisabled(): void;

  update(delta: number): void;

  draw(config: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  }): void;

  getComponent<SomeClass extends Instantiable>(
    componentClass: SomeClass
  ): InstanceType<SomeClass> | null;
}

export type ComponentConfig = {
  isEnabled: boolean;
};

export default class BaseComponent implements ComponentInterface {
  entity: Entity | null = null;
  isEnabled: boolean;

  constructor(config: Partial<ComponentConfig> = {}) {
    this.isEnabled = config.isEnabled ?? true;
  }

  _receiveEntity(entity: Entity | null) {
    this.entity = entity;
    this.onEntityReceived(entity);
  }

  enable() {
    this.isEnabled = true;
    this.onEnabled();
  }

  disable() {
    this.isEnabled = false;
    this.onDisabled();
  }

  onEntityReceived(_entity: Entity | null): void {}

  onEnabled(): void {}

  update(_delta: number): void {}

  draw(_config: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  }): void {}

  onDisabled(): void {}

  getComponent<SomeClass extends Instantiable>(
    componentClass: SomeClass
  ): InstanceType<SomeClass> | null {
    if (this.entity == null) return null;
    return this.entity.getComponent(componentClass);
  }
}
