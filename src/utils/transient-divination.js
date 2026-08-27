let retained = null

/** Retain the currently viewed cloud divination in memory across logout navigation. */
export const rememberTransientDivination = (record) => {
  retained = record ? structuredClone(record) : null
}

export const findTransientDivination = (identifier) => (
  retained && [retained.id, retained.clientId].includes(identifier) ? structuredClone(retained) : null
)

export const clearTransientDivination = () => { retained = null }
