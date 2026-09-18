export function joinRoutePath(area: string, path: string): string {
  const cleaned = path.replace(/^\/+|\/+$/g, '');
  return cleaned ? `${area}/${cleaned}` : area;
}
