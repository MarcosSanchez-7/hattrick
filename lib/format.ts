const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export const formatPrice = (value: number) => eur.format(value);
