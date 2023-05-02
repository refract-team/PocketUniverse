export function ShadowTextBox(props) {
  return (
    <div className="shadow-dark-border flex w-full grow flex-col justify-center gap-10 p-6 text-start text-gray-300">
      {props.children}
    </div>
  );
}
