import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FinancialChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-[var(--color-textSecondary)] py-8">No financial data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="income" fill="var(--color-success)" name="Income" />
        <Bar dataKey="expenses" fill="var(--color-error)" name="Expenses" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default FinancialChart;
