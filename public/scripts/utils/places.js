"use strict";
    import {APILoader} from 'https://unpkg.com/@googlemaps/extended-component-library@0.6';

    const CONFIGURATION = {
      "mapsApiKey": "AIzaSyA4iu52UT4JEx3Reh5fk0VI6WCafwqZwtM",
      "capabilities": {"addressAutocompleteControl":true}
    };

    const SHORT_NAME_ADDRESS_COMPONENT_TYPES =
        new Set(['street_number', 'administrative_area_level_2', 'postal_code']);

    const ADDRESS_COMPONENT_TYPES_IN_FORM = [
      'location',
      'locality',
      'administrative_area_level_2',
      'postal_code',
      'country',
    ];

    function getFormInputElement(componentType) {
        return document.getElementById(`${componentType}-input`);
    }

    function getComponentName(componentType, place) {
    for (const component of place.address_components || []) {
        if (component.types[0] === componentType) {
            if(componentType == 'country'){
                return component.short_name
            }else{
                return SHORT_NAME_ADDRESS_COMPONENT_TYPES.has(componentType) ?
                component.short_name :
                component.long_name;
            }
        }
    }
    return '';
}

function fillInLuogoNascita(place) {
    const luogoNascitaInput = document.getElementById('location-input');
    if(getComponentName('administrative_area_level_2', place)){
        luogoNascitaInput.value = `${getComponentName('locality', place)}, ${getComponentName('administrative_area_level_2', place)}, ${getComponentName('country', place)}`;
    }else{
        luogoNascitaInput.value = `${getComponentName('locality', place)}, ${getComponentName('administrative_area_level_1', place)}, ${getComponentName('country', place)}`;
    }
    
}



function fillInResidenza(place) {
    const residenzaInput = document.getElementById('locality-input');
    residenzaInput.value = `${getComponentName('route', place)}, ${getComponentName('street_number', place)}, ${getComponentName('postal_code', place)}, ${getComponentName('administrative_area_level_3', place)}, ${getComponentName('administrative_area_level_2', place)}`;
}



async function initMap() {
    const {Autocomplete} = await APILoader.importLibrary('places');

    const luogoNascitaAutocomplete = new Autocomplete(getFormInputElement('location'), {
        fields: ['address_components', 'geometry', 'name'],
        types: ['locality'],
    });

    luogoNascitaAutocomplete.addListener('place_changed', () => {
        const placeLuogoNascita = luogoNascitaAutocomplete.getPlace();
        if (!placeLuogoNascita.geometry) {
            window.alert(`No details available for input: '${placeLuogoNascita.name}'`);
            return;
        }
        console.log(placeLuogoNascita)
        fillInLuogoNascita(placeLuogoNascita);
    });

    const residenzaAutocomplete = new Autocomplete(getFormInputElement('locality'), {
        fields: ['address_components', 'geometry', 'name'],
        types: ['address'],
    });

    residenzaAutocomplete.addListener('place_changed', () => {
        const placeResidenza = residenzaAutocomplete.getPlace();
        if (!placeResidenza.geometry) {
            window.alert(`No details available for input: '${placeResidenza.name}'`);
            return;
        }
        fillInResidenza(placeResidenza);
    });
}

    initMap();