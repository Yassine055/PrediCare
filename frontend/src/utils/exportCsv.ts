type CsvValue = string | number | boolean | null | undefined;

const escapeCsvValue = (value: CsvValue) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n\r;]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const downloadCsv = (
  filename: string,
  rows: Record<string, CsvValue>[],
) => {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(escapeCsvValue).join(';'),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(';')
    ),
  ].join('\n');

  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
