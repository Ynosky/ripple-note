import { StateField, StateEffect, Facet, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

// Effect to add authorship marks
export const addAuthorMark = StateEffect.define<{from: number, to: number, authorId: string}>();

// Facet to provide the current active author ID
export const currentAuthorFacet = Facet.define<string, string>({
  combine: values => values.length ? values[values.length - 1] : 'me'
});

// State field to store the decorations
export const authorshipField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // Map existing decorations through the document changes
    decorations = decorations.map(tr.changes);
    
    // Process explicit effects (e.g., from custom paste)
    for (let e of tr.effects) {
      if (e.is(addAuthorMark)) {
        if (e.value.authorId === 'ai') {
          // AI テキストに対して虹色グラデーションクラスを適用
          // 指定範囲全体に対して 'author-ai' クラスを1つの Decoration として適用
          const deco = Decoration.mark({ 
            class: 'author-ai'
          });
          decorations = decorations.update({
            add: [deco.range(e.value.from, e.value.to)]
          });
        } else {
          // 他の author（user1, user2 など）は従来通り
          const deco = Decoration.mark({ class: `author-${e.value.authorId}` });
          decorations = decorations.update({
            add: [deco.range(e.value.from, e.value.to)]
          });
        }
      }
    }
    
    // Automatically attribute newly typed/pasted text to the current author
    // unless it's a transaction that already has explicit author marks (like our custom paste)
    const hasExplicitMarks = tr.effects.some(e => e.is(addAuthorMark));
    if (tr.docChanged && !hasExplicitMarks) {
      const currentAuthor = tr.state.facet(currentAuthorFacet);
      const newDecos: any[] = [];
      
      tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        if (fromB < toB) {
          if (currentAuthor === 'ai') {
            const deco = Decoration.mark({ class: 'author-ai' });
            newDecos.push(deco.range(fromB, toB));
          } else {
            const deco = Decoration.mark({ class: `author-${currentAuthor}` });
            newDecos.push(deco.range(fromB, toB));
          }
        }
      });
      
      if (newDecos.length > 0) {
        decorations = decorations.update({ add: newDecos });
      }
    }
    
    return decorations;
  },
  provide: f => EditorView.decorations.from(f),
  toJSON(value, state) {
    const ranges: any[] = [];
    value.between(0, state.doc.length, (from, to, value) => {
      ranges.push({ from, to, class: value.spec.class });
    });
    return ranges;
  },
  fromJSON(json, state) {
    if (!Array.isArray(json)) return Decoration.none;
    const decos = json.map(r => Decoration.mark({ class: r.class }).range(r.from, r.to));
    return Decoration.set(decos, true);
  }
});

// Helper to get the extension array
export function authorshipExtension(currentAuthorId: string) {
  return [
    currentAuthorFacet.of(currentAuthorId),
    authorshipField
  ];
}

