import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";

const PasswordInput = forwardRef(function PasswordInput(
  {
    className = "",
    buttonClassName = "",
    containerClassName = "",
    ...props
  },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${containerClassName}`.trim()}>
      <input ref={ref} type={visible ? "text" : "password"} className={className} {...props} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className={`absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white ${buttonClassName}`.trim()}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
});

export default PasswordInput;
