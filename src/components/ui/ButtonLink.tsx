import Link from 'next/link';
import type { ComponentProps } from 'react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './Button';

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/**
 * Navigation styled as a Button. Use this instead of `<Link><Button/></Link>`:
 * nesting a <button> inside an <a> is invalid HTML and creates two tab stops
 * for one action. Renders a single <a> with the exact Button styling.
 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, size, className)} {...rest} />;
}
