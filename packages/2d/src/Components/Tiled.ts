import { useType, useNewComponent, Component } from "@hex-engine/core";
import SpriteSheet from "./SpriteSheet";
import TileMap from "./TileMap";
import { Grid, Point } from "../Models";

function getElementByTagName(
  parent: XMLSourceLoader.Element,
  tagName: string
): null | Exclude<XMLSourceLoader.Element, string> {
  if (typeof parent === "string") return null;

  if (!parent.children) return null;

  const maybeEl = parent.children.find(
    (child) => typeof child !== "string" && child.tagName === tagName
  );

  if (maybeEl && typeof maybeEl !== "string") {
    return maybeEl;
  }

  return null;
}

function getElementsByTagName(
  parent: XMLSourceLoader.Element,
  tagName: string
): Array<Exclude<XMLSourceLoader.Element, string>> {
  if (typeof parent === "string") return [];

  if (!parent.children) return [];

  const els = parent.children.filter(
    (child) => typeof child !== "string" && child.tagName === tagName
  );

  // @ts-ignore
  return els;
}

/**
 * This Component loads data from a Tiled XML tileset file
 * and creates a `SpriteSheet` Component out of it.
 * @param data The tileset XML file
 */
function Tileset(data: XMLSourceLoader.Element) {
  useType(Tileset);

  if (
    typeof data === "string" ||
    data.tagName !== "tileset" ||
    !data.children
  ) {
    throw new Error("Invalid XML data passed to Tiled.Tileset");
  }

  const image = getElementByTagName(data, "image")!;
  if (!image || typeof image === "string") {
    throw new Error(
      "XML data passed to Tiled.Tileset does not contain an image"
    );
  }

  const imageUrl = image.attributes.source;
  if (typeof imageUrl !== "string") {
    throw new Error(
      "source attribute of image in XML data passed to Tiled.Tileset is not a string"
    );
  }

  const tileWidth = data.attributes.tilewidth;
  if (typeof tileWidth !== "number") {
    throw new Error(
      "tilewidth attribute of tileset in XML data passed to Tiled.Tileset is not a number"
    );
  }

  const tileHeight = data.attributes.tileheight;
  if (typeof tileHeight !== "number") {
    throw new Error(
      "tileheight attribute of tileset in XML data passed to Tiled.Tileset is not a number"
    );
  }

  const spriteSheet = useNewComponent(() =>
    SpriteSheet({
      url: imageUrl,
      tileWidth: Number(tileWidth) || 0,
      tileHeight: Number(tileHeight) || 0,
    })
  );

  return {
    spriteSheet,
  };
}

/**
 * This Component represents the data for a single layer within a Tiled map XML file.
 *
 * You'll rarely create it directly; instead, you'll get it from a Tiled.Map.
 *
 * @param layer The layer XML element
 */
function Layer(layer: XMLSourceLoader.Element) {
  useType(Layer);

  if (typeof layer === "string" || layer.tagName !== "layer") {
    throw new Error("Invalid XML data passed to Tiled.Layer");
  }

  const width = layer.attributes.width;
  if (typeof width !== "number") {
    throw new Error(
      "`width` attribute in XML data passed to Tiled.Layer was not a number"
    );
  }

  const height = layer.attributes.height;
  if (typeof height !== "number") {
    throw new Error(
      "`height` attribute in XML data passed to Tiled.Layer was not a number"
    );
  }

  const dataEl = getElementByTagName(layer, "data")!;
  if (!dataEl || typeof dataEl === "string") {
    throw new Error(
      "`data` element not found in XML data passed to Tiled.Layer"
    );
  }

  if (dataEl.attributes.encoding !== "csv") {
    throw new Error(
      "XML layer data passed to Tiled.Layer does not use csv encoding. Only csv encoding is supported at this time."
    );
  }

  const grid = new Grid(width, height, 0);
  if (dataEl.children) {
    const csv = dataEl.children.join(" ");
    const numbers = csv
      .split(",")
      .map((cell) => Number(cell.trim()))
      .map((tileIndex) => tileIndex - 1);
    grid.setData(numbers);
  }

  return {
    grid,
    visible: layer.attributes.visible !== 0,
  };
}

type TiledProperty = {
  name: string;
  value: string;
  type: "bool" | "color" | "float" | "file" | "int" | "string";
};
type BaseTiledObjectApi = {
  object: XMLSourceLoader.Element;
  id: string;
  name: string;
  location: Point;
  size?: Point;
  properties: Array<TiledProperty>;
};
type TiledObjectApi =
  | {
      kind: "string";
      object: string;
    }
  | ({
      kind: "unknown";
    } & BaseTiledObjectApi)
  | ({
      kind: "point";
    } & BaseTiledObjectApi)
  | ({
      kind: "ellipse";
    } & BaseTiledObjectApi)
  | ({
      kind: "text";
    } & BaseTiledObjectApi)
  | ({
      kind: "polygon";
      points: Array<Point>;
    } & BaseTiledObjectApi);
function makeTiledObject(object: XMLSourceLoader.Element): TiledObjectApi {
  useType(TiledMap);

  if (typeof object === "string") {
    return {
      kind: "string",
      object,
    };
  }

  const api: BaseTiledObjectApi = {
    id: object.attributes.id,
    name: object.attributes.name,
    location: new Point(
      Number(object.attributes.x),
      Number(object.attributes.y)
    ),
    size:
      object.attributes.width && object.attributes.height
        ? new Point(
            Number(object.attributes.width),
            Number(object.attributes.height)
          )
        : undefined,
    object,
    properties: [],
  };

  const maybePropertiesEl = getElementByTagName(object, "properties");
  if (maybePropertiesEl) {
    const properties = getElementsByTagName(maybePropertiesEl, "property");
    for (const child of properties) {
      api.properties.push({
        name: child.attributes.name,
        value: child.attributes.value,
        type: child.attributes.type,
      });
    }
  }

  const maybePointEl = getElementByTagName(object, "point");
  if (maybePointEl) {
    return {
      ...api,
      kind: "point",
    };
  }

  const maybeEllipseEl = getElementByTagName(object, "ellipse");
  if (maybeEllipseEl) {
    return {
      ...api,
      kind: "ellipse",
    };
  }

  const maybeTextEl = getElementByTagName(object, "text");
  if (maybeTextEl) {
    return {
      ...api,
      kind: "text",
    };
  }

  const maybePolygonEl = getElementByTagName(object, "polygon");
  if (maybePolygonEl) {
    return {
      ...api,
      kind: "polygon",
      points: maybePolygonEl.attributes.points
        .split(" ")
        .map((pairString: string) => pairString.split(","))
        .map(
          (pair: [string, string]) =>
            new Point(Number(pair[0]), Number(pair[1]))
        ),
    };
  }

  return {
    ...api,
    kind: "unknown",
  };
}

/**
 * This Component loads data from a Tiled map XML file and creates
 * SpriteSheet and TileMap Components that you can use to draw the
 * map into the canvas.
 *
 * @param data The Tiled map XML file
 */
function TiledMap(data: XMLSourceLoader.Element) {
  useType(TiledMap);

  if (typeof data === "string" || data.tagName !== "map") {
    throw new Error("Invalid XML data passed to Tiled.Map");
  }

  const tilesetEl = getElementByTagName(data, "tileset")!;
  if (!tilesetEl || typeof tilesetEl === "string") {
    throw new Error("tileset not found in XML data passed to Tiled.Map");
  }

  const tileset = useNewComponent(() => Tileset(tilesetEl.attributes.source));

  const layerEls = data.children
    ? data.children.filter(
        (child) => typeof child !== "string" && child.tagName === "layer"
      )
    : [];

  const layers: Array<Component & ReturnType<typeof Layer>> = [];
  for (const layerEl of layerEls) {
    layers.push(useNewComponent(() => Layer(layerEl)));
  }

  const tileMaps = layers
    .filter((layer) => layer.visible)
    .map((layer) =>
      useNewComponent(() => TileMap(tileset.spriteSheet, layer.grid))
    );

  const maxX = layers.reduce(
    (prev, layer) => Math.max(prev, layer.grid.size.x),
    0
  );
  const maxY = layers.reduce(
    (prev, layer) => Math.max(prev, layer.grid.size.y),
    0
  );
  const sizeInTiles = new Point(maxX, maxY);
  const sizeInPixels = sizeInTiles.multiply(tileset.spriteSheet.tileSize);

  const objectGroups = data.children
    ? data.children.filter(
        (child) => typeof child !== "string" && child.tagName === "objectgroup"
      )
    : [];

  const objects: Array<XMLSourceLoader.Element> = [];
  for (const objectGroup of objectGroups) {
    if (typeof objectGroup === "string") continue;

    if (!objectGroup.children) continue;
    for (const object of objectGroup.children) {
      if (typeof object === "string") continue;

      objects.push(object);
    }
  }

  return {
    /** The tileset used by the map */
    tileset,

    /** An Array of Tiled.Layer Compponents, each corresponding to a layer in the Tiled map */
    layers,

    /** An Array of TileMap Components, each corresponding to a *visible* layer in the Tiled map */
    tileMaps,

    /** The size of the map in tiles */
    sizeInTiles,

    /** The size of the map in pixels */
    sizeInPixels,

    /** The size of a single tile in the map */
    tileSize: tileset.spriteSheet.tileSize,

    /** All the objects that were present in the map, for you to use however you like */
    objects: objects.map((obj) => makeTiledObject(obj)),
  };
}

Object.defineProperty(Tileset, "name", { value: "Tiled.Tileset" });
Object.defineProperty(Layer, "name", { value: "Tiled.Layer" });
Object.defineProperty(TiledMap, "name", { value: "Tiled.Map" });

/** This Object has Components on it that help you work with maps and tilesets from Tiled. */
const Tiled = {
  /**
   * This Component loads data from a Tiled XML tileset file
   * and creates a `SpriteSheet` Component out of it.
   */
  Tileset,

  /**
   * This Component represents the data for a single layer within a Tiled map XML file.
   *
   * You'll rarely create it directly; instead, you'll get it from a Tiled.Map.
   */
  Layer,

  /**
   * This Component loads data from a Tiled map XML file and creates
   * SpriteSheet and TileMap Components that you can use to draw the
   * map into the canvas.
   */
  Map: TiledMap,
};

export default Tiled;
