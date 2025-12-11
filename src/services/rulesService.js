/**
 * Service pour charger et rechercher les règles de correction des critères 4 et 5
 */

import rulesData from '../data/Regles_Correction_Criteres_4_5.json'

/**
 * Recherche récursive d'une règle par son ID dans la structure hiérarchique
 * Retourne la règle et son chemin hiérarchique (parents)
 */
function findRuleRecursive(obj, targetId, path = []) {
  // Vérifier si l'objet actuel a l'ID recherché
  if (obj.id === targetId) {
    return { rule: obj, path: [...path] }
  }

  // Chercher dans les différentes propriétés qui peuvent contenir des enfants
  const childProperties = [
    'sections',
    'sous_sections',
    'regles',
    'categories',
    'sous_regles',
    'types',
  ]

  for (const prop of childProperties) {
    if (obj[prop] && Array.isArray(obj[prop])) {
      for (const child of obj[prop]) {
        const currentPath = [...path, { id: obj.id, nom: obj.nom, description: obj.description }]
        const result = findRuleRecursive(child, targetId, currentPath)
        if (result) {
          return result
        }
      }
    }
  }

  return null
}

/**
 * Recherche une règle par son ID et retourne la hiérarchie complète
 * @param {string} ruleId - L'ID de la règle (ex: "5.3.1.1", "4.2.2.10.1.2f")
 * @returns {Object|null} - { rule, hierarchy } où hierarchy contient les parents
 */
export function findRuleById(ruleId) {
  if (!ruleId) return null

  // Nettoyer l'ID (enlever les espaces, gérer les variantes comme "a", "b", etc.)
  const cleanId = ruleId.trim()

  // Déterminer le critère (4 ou 5)
  const criteriaId = parseInt(cleanId.charAt(0))
  const criteria = rulesData.criteres.find((c) => c.id === criteriaId)

  if (!criteria) return null

  // Chercher la règle dans le critère (on ne passe pas le critère dans le path initial)
  const result = findRuleRecursive(criteria, cleanId, [])

  if (result) {
    // Filtrer le chemin pour enlever le critère s'il y est (éviter les doublons)
    // et ne garder que les éléments avec un ID valide
    const filteredPath = result.path.filter(
      (p) => p.id && p.id !== criteria.id && p.id !== criteriaId,
    )

    // Construire la hiérarchie avec le critère au début (une seule fois)
    const hierarchy = [
      {
        id: criteria.id,
        nom: criteria.nom,
        description: criteria.description,
      },
      ...filteredPath,
    ]

    return {
      rule: result.rule,
      hierarchy: hierarchy,
    }
  }

  // Si pas trouvé directement, essayer de trouver une règle parente
  // Par exemple, "4.2.2.10.1.e" pourrait être sous "4.2.2.10.1"
  const idParts = cleanId.split('.')
  while (idParts.length > 1) {
    // Essayer avec le suffixe lettre séparé
    const lastPart = idParts[idParts.length - 1]
    if (lastPart.length > 1 && /[a-z]$/.test(lastPart)) {
      // Essayer avec l'ID sans la lettre finale (ex: "4.2.2.10.1.2f" -> "4.2.2.10.1.2")
      const numericPart = lastPart.replace(/[a-z]$/, '')
      const parentId = [...idParts.slice(0, -1), numericPart].join('.')
      const parentResult = findRuleRecursive(criteria, parentId, [])
      if (parentResult) {
        // Chercher dans les sous-règles avec le suffixe
        const suffix = lastPart.slice(-1)
        const subRuleId = parentId + suffix
        if (parentResult.rule.regles) {
          const subRule = parentResult.rule.regles.find((r) => r.id === subRuleId)
          if (subRule) {
            const hierarchy = [
              { id: criteria.id, nom: criteria.nom, description: criteria.description },
              ...parentResult.path.filter((p) => p.id),
              {
                id: parentResult.rule.id,
                nom: parentResult.rule.nom,
                description: parentResult.rule.description,
              },
            ]
            return { rule: subRule, hierarchy }
          }
        }
      }
    }

    idParts.pop()
    const parentId = idParts.join('.')
    const parentResult = findRuleRecursive(criteria, parentId, [])
    if (parentResult) {
      const hierarchy = [
        { id: criteria.id, nom: criteria.nom, description: criteria.description },
        ...parentResult.path.filter((p) => p.id),
      ]
      return {
        rule: parentResult.rule,
        hierarchy: hierarchy,
        note: `Règle exacte "${cleanId}" non trouvée, affichage de la règle parente.`,
      }
    }
  }

  return null
}

/**
 * Obtient les informations du critère par son ID
 */
export function getCriteriaInfo(criteriaId) {
  return rulesData.criteres.find((c) => c.id === criteriaId)
}

/**
 * Obtient les marques de correction pour un critère
 */
export function getCorrectionMarks(criteriaId) {
  const criteria = getCriteriaInfo(criteriaId)
  return criteria?.marques_correction || {}
}

export default {
  findRuleById,
  getCriteriaInfo,
  getCorrectionMarks,
}
