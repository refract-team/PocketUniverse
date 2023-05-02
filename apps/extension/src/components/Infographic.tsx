import { ShadowTextBox } from "~components/ShadowTextBox";

/// Infographic typically a single image with text.
export function Infographic(props: any) {
  return (
    <div className="flex w-full grow flex-col items-center justify-center justify-center text-center text-base font-medium">
      <div className="flex w-full flex-col items-center gap-6 bg-gray-900 px-6 py-6">
        <img src={props.image} className="h-48 w-48" alt={props.alt} />
        <div>{props.title}</div>
      </div>
      <ShadowTextBox>{props.description}</ShadowTextBox>
    </div>
  );
}
