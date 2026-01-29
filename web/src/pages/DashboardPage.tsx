import { useEffect, useState } from "react";
import { adminFetch } from "../lib/api";

interface SummaryResponse {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  totalPaidAmountCents: number;
  paidByOption: {
    option1Count: number;
    option2Count: number;
  };
}

const DashboardPage = () => {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminFetch<SummaryResponse>("/api/admin/summary/today")
      .then((data) => {
        setSummary(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao buscar dados");
      })
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      value / 100
    );

  return (
    <div>
      <h1>Resumo do dia</h1>
      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}
      {summary && (
        <div className="dashboard-grid">
          <div className="card">
            <p className="label">Pedidos totais</p>
            <p className="value">{summary.totalOrders}</p>
          </div>
          <div className="card">
            <p className="label">Pedidos pagos</p>
            <p className="value">{summary.paidOrders}</p>
          </div>
          <div className="card">
            <p className="label">Pedidos pendentes</p>
            <p className="value">{summary.pendingOrders}</p>
          </div>
          <div className="card">
            <p className="label">Total recebido</p>
            <p className="value">{formatCurrency(summary.totalPaidAmountCents)}</p>
          </div>
          <div className="card">
            <p className="label">PIX Pagos Opção 1</p>
            <p className="value">{summary.paidByOption.option1Count}</p>
          </div>
          <div className="card">
            <p className="label">PIX Pagos Opção 2</p>
            <p className="value">{summary.paidByOption.option2Count}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
