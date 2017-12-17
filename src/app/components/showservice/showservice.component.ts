import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ApiService} from '../../_services/api.service';
import {RatingComponent} from '../_modals/rating/rating.component';
import {MatDialog, MatSnackBar, MatTabChangeEvent} from '@angular/material';
import {AuthService} from '../../_services/auth.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {DatePipe} from '@angular/common';

declare const google;

@Component({
    selector: 'app-showservice',
    templateUrl: './showservice.component.html',
    styleUrls: ['./showservice.component.css']
})

export class ShowserviceComponent implements OnInit, AfterViewInit {
    service: any = {};
    images: any[] = [];
    days: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    week_days: any = '';
    comment: number;
    loggedIn = false;
    commentForm: FormGroup;
    model: any;
    loading: boolean;
    error: string;
    submitAttempt: boolean;
    currentUser: any;

    @ViewChild('map') mapElement: ElementRef;
    map: any;
    latLng: any;
    infoWindow: any;
    positions: any;
    currentPosition: any;
    currentEnd: any;
    image: any;
    directionsService: any;
    directionsDisplay: any;
    distanceMatrix;
    markers: any;

    constructor(private route: ActivatedRoute, private apiServices: ApiService,
                public dialog: MatDialog, private authServices: AuthService, private snackBar: MatSnackBar) {
        this.model = {};
        this.loading = false;
        this.markers = new Array();
        this.currentEnd = {id: -1};

        this.submitAttempt = false;
        if (typeof google !== 'undefined') {
            this.latLng = new google.maps.LatLng(23.13302, -82.38304);
            this.infoWindow = new google.maps.InfoWindow;

            this.image = new google.maps.MarkerImage('https://upload.wikimedia.org/wikipedia/commons/a/a2/Location_dot_cyan.svg', null, null, null, new google.maps.Size(15, 15));
            this.currentPosition = new google.maps.Marker({});

            this.distanceMatrix = new google.maps.DistanceMatrixService;

            this.directionsService = new google.maps.DirectionsService;
            this.directionsDisplay = new google.maps.DirectionsRenderer;
            let content = '<h6 class="tc-blue">Mi Posición</h6>';
            this.addInfoWindow(this.currentPosition, content);
        }
    }

    ngOnInit() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            this.currentUser = JSON.parse(currentUser).email;
        }

        this.authServices.currentUser.subscribe(user => {
            this.loggedIn = !!user;
        });

        this.route.params.subscribe(params => {
            const id = params['id'];
            this.apiServices.service(id).subscribe(result => {
                this.service = result.data;
                this.images = result.data.imagesList;
                this.comment = result.data.servicecommentsList.length;
                this.result_week_days();
            });
        });

        this.createForm();

        this.commentForm.controls['textcomment'].valueChanges.subscribe(result => {
            if (result && (result.length > 9)) {
                this.submitAttempt = true;
            } else {
                this.submitAttempt = false;
            }
        });
    }

    ngAfterViewInit() {
    }

    tabChanged = (tabChangeEvent: MatTabChangeEvent): void => {
        if (tabChangeEvent.index === 1) {
            if (typeof google !== 'undefined') {
                this.initMap();
                this.addPositions(this);
                this.currentEnd.id = -1;

                this.directionsDisplay.setMap(null);
                // google.maps.event.trigger(this.map, 'resize');
            }
        }
    }

    initMap() {
        if (typeof google !== 'undefined') {
            let mapOptions = {
                center: this.latLng,
                zoom: 10,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                zoomControl: true,
                mapTypeControl: false,
                scaleControl: false,
                streetViewControl: false,
                rotateControl: true,
                fullscreenControl: false
            };
            this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
        }
    }

    addPositions(that: any) {
        if (typeof google !== 'undefined') {
            this.directionsDisplay.setMap(this.map);
            this.directionsDisplay.setOptions({suppressMarkers: true});
            this.positions = this.service.positionsList;
            for (let i = 0; i < this.positions.length; i++) {
                setTimeout(() => {
                    let marker = new google.maps.Marker({
                        map: this.map,
                        position: new google.maps.LatLng(this.positions[i].latitude, this.positions[i].longitude),
                        animation: google.maps.Animation.DROP,
                    });

                    that.markers.push(marker);

                    let content = '<h6 class="tc-blue">' + this.positions[i].title + '</h6>';
                    this.addInfoWindow(marker, content);
                }, i * 200);
            }

            // navigator.geolocation.getCurrentPosition(function (position) {
            //     console.log(position);
            // })

            if (window.navigator.geolocation) {
                window.navigator.geolocation.watchPosition(function (position) {
                    const latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

                    that.currentPosition.setPosition(latLng);
                    that.currentPosition.setIcon(that.image);
                    that.currentPosition.setMap(that.map);
                    that.map.panTo(latLng);

                    if (that.currentEnd.id !== -1)
                        that.calculateAndDisplayRoute();

                }, function () {
                    that.currentPosition.setMap(null);
                });
            }
            else {
                that.currentPosition.setMap(null);
            }
        }
    }

    addInfoWindow(marker, content) {
        if (typeof google !== 'undefined') {
            google.maps.event.addListener(marker, 'click', () => {
                this.infoWindow.setContent(content)
                this.infoWindow.open(this.map, marker);
            });
        }
    }

    changeCurrentEnd(pos) {
        if (this.currentEnd.id !== -1) {
            if (this.currentEnd.id === pos) {
                this.currentEnd.id = -1;
                this.directionsDisplay.setMap(null);
                this.map.setZoom(11);
            }
            else {
                this.currentEnd.id = pos;
                this.currentEnd.marker = this.markers[pos];
                this.directionsDisplay.setMap(this.map);
                this.calculateAndDisplayRoute();
            }
        }
        else {
            this.directionsDisplay.setMap(this.map);
            this.currentEnd.id = pos;
            this.currentEnd.marker = this.markers[pos];
            this.calculateAndDisplayRoute();
        }
    }

    calculateAndDisplayRoute() {
        this.directionsService.route({
            origin: this.currentPosition.getPosition(),
            destination: this.currentEnd.marker.getPosition(),
            travelMode: 'DRIVING'
        }, (response, status) => {
            if (status === 'OK') {
                this.directionsDisplay.setDirections(response);
            } else {
                window.alert('Directions request failed due to ' + status);
            }
        });
    }

    result_week_days() {
        if (this.service.week_days !== '') {
            const days = this.service.week_days.split(',');
            let result = '';
            for (const day of days) {
                result += this.days[day] + ', ';
            }
            this.week_days = result.substring(0, (result.length - 2));
        }
        else {
            this.week_days = '';
        }
    }

// hasClass(element, cls) {
//     return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
// }

    hideComment(id: number, hided: boolean) {
        // let button = document.getElementById('hided-' + id);
        if (hided) {
            this.apiServices.showComment(id).subscribe(result => {
                if (result) {
                    if (result.data) {
                        this.service = result.data;
                        return true;
                    }
                    else {
                        this.error = result.error;
                    }
                }
                else {
                    this.error = 'Error en el servidor';
                }
            });
        }
        else {
            this.apiServices.hideComment(id).subscribe(result => {
                if (result) {
                    if (result.data) {
                        this.service = result.data;
                        return true;
                    }
                    else {
                        this.error = result.error;
                    }
                }
                else {
                    this.error = 'Error en el servidor';
                }
            });
        }
    }

    reportComment(id: number) {
        this.apiServices.reportComment(id).subscribe(result => {
            if (result.data) {
                this.service = result.data;
            }
            else {
                this.error = result.error;
            }
        });
    }

    createForm() {
        this.commentForm = new FormGroup({
            textcomment: new FormControl('', Validators.minLength(10))
        });
    }

    getErrorMessage() {
        return this.commentForm.controls['textcomment'].hasError('minlength') ? 'Min 10 characters' :
            '';
    }

    ratingDialog(id: number): void {
        const dialogRef = this.dialog.open(RatingComponent, {
            width: '70%',
            height: '245px',
            data: {service: this.service}
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.service = result;
                this.openSnackBar('El servicio ha sido evaluado satisfactoriamente', 2500);
            }
        });
    }

    openSnackBar(message: string, duration: number, action ?: string) {
        this.snackBar.open(message, action, {
            duration: duration,
            horizontalPosition: 'center',
        });
    }

    sendComment() {
        this.loading = true;
        this.apiServices.addComment(this.service.id, this.model.textcomment).subscribe(result => {
            if (result) {
                this.service = result;
                this.comment = this.service.servicecommentsList.length;
                this.loading = false;
                this.submitAttempt = false;
                this.commentForm.reset();
            }
            else {
                this.error = 'Error en el servidor';
                this.loading = false;
            }
        });
    }
}
