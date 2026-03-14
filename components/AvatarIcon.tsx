import {
  Bird,
  Cat,
  Dog,
  FishSymbol,
  Mouse,
  PawPrint,
  Rabbit,
  Rat,
  Squirrel,
  Turtle
} from "lucide-react";
import { ComponentType } from "react";
import { AvatarIconId, DEFAULT_AVATAR_ICON_ID } from "@/lib/avatar-icons";

type Props = {
  iconId?: string;
  className?: string;
};

const ICONS: Record<AvatarIconId, ComponentType<{ className?: string }>> = {
  panther: Cat,
  wolf: Dog,
  eagle: Bird,
  shark: FishSymbol,
  rabbit: Rabbit,
  cobra: Rat,
  rhino: Turtle,
  bear: Squirrel,
  tiger: PawPrint,
  lion: Mouse
};

export function AvatarIcon({ iconId, className }: Props) {
  const id = (iconId && iconId in ICONS ? (iconId as AvatarIconId) : DEFAULT_AVATAR_ICON_ID);
  const Icon = ICONS[id];
  return <Icon className={className} />;
}
