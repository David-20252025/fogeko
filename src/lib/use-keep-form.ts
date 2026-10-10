"use client";

import { startTransition } from "react";

// React 19 vide un <form action={…}> après chaque envoi, même en cas d'erreur.
// En passant par onSubmit, la saisie est conservée ; on vide seulement après un succès si demandé.
export const keepOnSubmit = (dispatch: (f: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => dispatch(fd));
};
