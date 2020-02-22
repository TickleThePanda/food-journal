window.addEventListener('load', () => {
  const template = document.querySelector('.js-meal-template');

  const addAnotherMealButton = document.querySelector('.js-add-meal');

  addAnotherMealButton.addEventListener('click', () => {
    const newMealContent = template.content.cloneNode(true);

    const nMeals = document.querySelectorAll('.js-meal-list-container .js-meal-item').length;

    const elementsWithFor = newMealContent.querySelectorAll('[for]');

    for (let e of elementsWithFor) {
      e.htmlFor = e.htmlFor.replace('@index@', nMeals);
    }

    const elementsWithId = newMealContent.querySelectorAll('[id]');

    for (let e of elementsWithId) {
      e.id = e.id.replace('@index@', nMeals);
    }

    const elementsWithName = newMealContent.querySelectorAll('[name]');

    for (let e of elementsWithName) {
      e.name = e.name.replace('@index@', nMeals);
    }

    const mealsContainer = document.querySelector('.js-meal-item');

    mealsContainer.appendChild(newMealContent);

  });

});
