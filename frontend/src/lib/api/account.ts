import { api } from "./client";
import type {
  AddCartItemInput,
  Cart,
  CartMergeResult,
  FavoriteState,
  Locale,
  Paginated,
  ProductCard,
  Profile,
  UpdateProfileInput,
} from "./types";

export interface FavoritesQuery {
  locale?: Locale;
  page?: number;
  pageSize?: number;
}

export const accountApi = {
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>("/me/password", { currentPassword, newPassword }),
  getProfile: () => api.get<Profile>("/me/profile"),
  updateProfile: (input: UpdateProfileInput) => api.patch<Profile>("/me/profile", input),
  /** Customers only; requires the current password. */
  deleteAccount: (currentPassword: string) => api.delete<void>("/me/account", { body: { currentPassword } }),

  favorites: {
    list: (query: FavoritesQuery = {}) =>
      api.getPage<ProductCard>("/me/favorites", { locale: "vi", ...query }),
    /** Ids of every favourite product (for heart button state). */
    ids: () => api.get<{ productIds: string[] }>("/me/favorites/ids"),
    add: (productId: string) => api.put<FavoriteState>(`/me/favorites/${encodeURIComponent(productId)}`),
    remove: (productId: string) => api.delete<FavoriteState>(`/me/favorites/${encodeURIComponent(productId)}`),
  },

  cart: {
    get: (locale: Locale = "vi") => api.get<Cart>("/me/cart", { locale }),
    addItem: (input: AddCartItemInput, locale: Locale = "vi") =>
      api.post<Cart>("/me/cart/items", input, { query: { locale } }),
    updateItem: (itemId: string, quantity: number, locale: Locale = "vi") =>
      api.patch<Cart>(`/me/cart/items/${encodeURIComponent(itemId)}`, { quantity }, { query: { locale } }),
    removeItem: (itemId: string, locale: Locale = "vi") =>
      api.delete<Cart>(`/me/cart/items/${encodeURIComponent(itemId)}`, { query: { locale } }),
    clear: (locale: Locale = "vi") => api.delete<Cart>("/me/cart", { query: { locale } }),
    merge: (items: AddCartItemInput[], locale: Locale = "vi") =>
      api.post<CartMergeResult>("/me/cart/merge", { items }, { query: { locale } }),
  },
};

export type { Paginated };
