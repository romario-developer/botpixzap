import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch } from "../lib/api";

interface MenuPayload {
  priceCents: number;
  deliveryFeeCents: number;
}

const MenuPage = () => {
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [price, setPrice] = useState("0.00");
  const [fee, setFee] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminFetch<MenuPayload>("/api/admin/menu/today")
      .then((data) => {
        setMenu(data);
        setPrice((data.priceCents / 100).toFixed(2));
        setFee((data.deliveryFeeCents / 100).toFixed(2));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar cardápio"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      priceCents: Math.round(Number(price) * 100),
      deliveryFeeCents: Math.round(Number(fee) * 100),
    };

    try {
      const updated = await adminFetch<MenuPayload>("/api/admin/menu/today", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setMenu(updated);
      setPrice((updated.priceCents / 100).toFixed(2));
      setFee((updated.deliveryFeeCents / 100).toFixed(2));
      setSuccess("Menu atualizado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Cardápio de hoje</h1>
      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {menu && (
        <form className="panel" onSubmit={handleSubmit}>
          <label>
            Preço (R$)
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
          </label>
          <label>
            Taxa de entrega (R$)
            <input
              type="number"
              step="0.01"
              min="0"
              value={fee}
              onChange={(event) => setFee(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      )}
    </div>
  );
};

export default MenuPage;
