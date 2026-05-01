import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';

type ClassNameProp = {
  className?: string;
};

const joinClassNames = (...classNames: Array<string | undefined>): string =>
  classNames.filter(Boolean).join(' ');

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ClassNameProp & {
    variant?: 'primary' | 'secondary' | 'ghost';
  };

export function Button({
  variant = 'secondary',
  className,
  type = 'button',
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={joinClassNames('cmm-button', `cmm-button-${variant}`, className)}
      type={type}
      {...props}
    />
  );
}

export type FieldProps = LabelHTMLAttributes<HTMLLabelElement> & {
  htmlFor: string;
  label: string;
  children: ReactNode;
};

export function Field({
  htmlFor,
  label,
  children,
  className,
  ...props
}: FieldProps): React.JSX.Element {
  return (
    <label className={joinClassNames('cmm-field', className)} htmlFor={htmlFor} {...props}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & ClassNameProp;

export function TextInput({ className, ...props }: TextInputProps): React.JSX.Element {
  return <input className={joinClassNames('cmm-input', className)} {...props} />;
}

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & ClassNameProp;

export function TextArea({ className, ...props }: TextAreaProps): React.JSX.Element {
  return <textarea className={joinClassNames('cmm-textarea', className)} {...props} />;
}
