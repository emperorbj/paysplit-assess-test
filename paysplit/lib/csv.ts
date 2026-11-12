/** Build a CSV string from rows, quoting every cell. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>) {
  return rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n")
}

/** Trigger a browser download of `content` as a file. */
export function downloadFile(
  filename: string,
  content: string,
  type = "text/csv;charset=utf-8"
) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
